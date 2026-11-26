alter table public.organization_invitations
    add column invited_user_id text references public.app_users(id) on delete set null;
alter table public.auth_sessions add column persistent boolean not null default false;

alter table public.organization_memberships add column accepted_invitation_id uuid;
create unique index organization_membership_accepted_invitation
    on public.organization_memberships(accepted_invitation_id) where accepted_invitation_id is not null;

-- All additional active memberships must come from the atomic acceptance path.
-- Existing ambiguous identities continue to fail closed.
create function public.guard_verified_company_membership() returns trigger
language plpgsql security definer set search_path=pg_catalog,public,pg_temp as $$
begin
    if tg_op='UPDATE' then
        if old.user_id=new.user_id and old.organization_id=new.organization_id and
            old.status=new.status and old.accepted_invitation_id is not distinct from new.accepted_invitation_id then
            return new;
        end if;
    end if;
    if new.status<>'active' then
        return new;
    end if;
    perform 1 from public.app_users where id=new.user_id for update;
    if new.accepted_invitation_id is not null then
        if current_setting('app.platform_operator',true) is distinct from 'true' or
           current_setting('app.user_id',true) is distinct from new.user_id or
           not exists (select 1 from public.organization_invitations i
              where i.id=new.accepted_invitation_id and i.organization_id=new.organization_id
                and i.invited_user_id=new.user_id and i.status='accepted' and i.expires_at>now()
                and i.role=new.role and i.module_profile=new.module_profile
                and exists (select 1 from public.auth_tokens t
                  where t.user_id=new.user_id and t.organization_id=new.organization_id
                    and t.token_type='invitation' and t.metadata->>'invitation_id'=i.id::text
                    and t.consumed_at=now() and t.expires_at>now())) then
            raise exception 'Missing verified invitation for membership' using errcode='23514',constraint='verified_company_membership';
        end if;
    elsif exists (select 1 from public.organization_memberships m where m.user_id=new.user_id
          and m.organization_id<>new.organization_id and m.status='active') then
        raise exception 'Additional membership requires a verified invitation' using errcode='23514',constraint='single_active_company_identity';
    end if;
    return new;
end;
$$;
revoke all on function public.guard_verified_company_membership() from public;
drop trigger single_company_identity on public.organization_memberships;
create trigger single_company_identity before insert or update of status,user_id,organization_id,accepted_invitation_id
    on public.organization_memberships for each row execute function public.guard_verified_company_membership();

-- The private slot invokes this as the migration table owner. The legacy
-- admin-owned check still supplies the unaffected owner and billing counters.
create function public.company_membership_preflight()
returns table (ambiguous_active_identities bigint, foreign_pending_invitations bigint)
language sql stable set search_path=pg_catalog
as $$
    select
        (select count(*) from (
            select m.user_id from public.organization_memberships m
            where m.status='active' and m.accepted_invitation_id is null
            group by m.user_id having count(*)>1
        ) as ambiguous),
        (select count(*) from public.organization_invitations i
            join public.app_users u on lower(u.email)=lower(i.email)
            where i.status='pending' and i.expires_at>now()
            and (i.invited_user_id is distinct from u.id or not exists (
                select 1 from public.organization_memberships target
                where target.user_id=u.id and target.organization_id=i.organization_id
                  and target.status='invited'))
            and exists (select 1 from public.organization_memberships m
                where m.user_id=u.id and m.organization_id<>i.organization_id));
$$;
revoke all on function public.company_membership_preflight() from public;
