alter table platform_operator_assignments
  add column email_password_hash text,
  add column email_setup_hash text,
  add column email_setup_expires_at timestamptz,
  add column email_code_hash text,
  add column email_challenge_hash text,
  add column email_code_expires_at timestamptz,
  add column email_code_attempts integer not null default 0;

alter table platform_auth_sessions drop constraint platform_auth_sessions_auth_source_check;
alter table platform_auth_sessions add constraint platform_auth_sessions_auth_source_check
  check (auth_source in ('entra','password_passkey','password_email_code'));
