alter table platform_operator_assignments
  drop constraint platform_operator_assignments_auth_source_check,
  add constraint platform_operator_assignments_auth_source_check
    check (auth_source in ('legacy', 'entra', 'email_code')),
  add column email_login_hash text,
  add column email_login_challenge_hash text,
  add column email_login_expires_at timestamptz,
  add column email_login_attempts integer not null default 0;

comment on column platform_operator_assignments.password_hash is
  'Scrypt credential for explicitly provisioned email_code operators.';

alter table platform_auth_sessions
  add column auth_source text not null default 'entra' check (auth_source in ('entra', 'email_code'));
