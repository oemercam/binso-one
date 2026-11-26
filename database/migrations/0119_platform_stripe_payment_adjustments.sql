create table public.platform_stripe_payment_adjustments (
    external_id text primary key,
    payment_id uuid not null references public.platform_billing_payments(id) on delete restrict,
    kind text not null check (kind in ('refund', 'dispute')),
    status text not null check (length(status) between 1 and 64),
    amount numeric(14,2) not null check (amount > 0),
    occurred_at timestamptz not null,
    updated_at timestamptz not null default now()
);

create index platform_stripe_payment_adjustments_payment_idx
    on public.platform_stripe_payment_adjustments (payment_id);

alter table public.platform_stripe_payment_adjustments enable row level security;
alter table public.platform_stripe_payment_adjustments force row level security;
create policy platform_stripe_payment_adjustments_operator
    on public.platform_stripe_payment_adjustments
    using (current_setting('app.platform_operator', true) = 'true')
    with check (current_setting('app.platform_operator', true) = 'true');

do $$
begin
    if exists (select from pg_roles where rolname = 'binso_runtime') then
        grant select, insert, update on public.platform_stripe_payment_adjustments to binso_runtime;
    end if;
end;
$$;
