alter table platform_operator_assignments
  add column passkey_password_hash text,
  add column passkey_setup_hash text,
  add column passkey_setup_expires_at timestamptz;

alter table platform_auth_sessions
  add column auth_source text not null default 'entra'
    check (auth_source in ('entra', 'password_passkey'));

create table platform_operator_passkeys (
  credential_id text primary key,
  user_id text not null references platform_operator_assignments(user_id) on delete cascade,
  public_key bytea not null,
  counter bigint not null check (counter >= 0),
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index platform_operator_passkeys_user_idx on platform_operator_passkeys(user_id);

create table platform_operator_passkey_challenges (
  token_hash text primary key,
  user_id text not null references platform_operator_assignments(user_id) on delete cascade,
  challenge text not null,
  purpose text not null check (purpose in ('authenticate', 'register')),
  assignment_version text not null,
  expires_at timestamptz not null
);
create index platform_operator_passkey_challenges_user_idx on platform_operator_passkey_challenges(user_id);
create index platform_operator_passkey_challenges_expiry_idx on platform_operator_passkey_challenges(expires_at);

revoke all on platform_operator_passkeys, platform_operator_passkey_challenges from public;
do $grant$
begin
  if exists(select 1 from pg_roles where rolname='binso_runtime') then
    grant select, insert, update on platform_operator_passkeys to binso_runtime;
    grant select, insert, delete on platform_operator_passkey_challenges to binso_runtime;
  end if;
end
$grant$;
