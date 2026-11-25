-- Document the purpose and boundary of the production operator credential store.
COMMENT ON TABLE public.platform_operator_passkeys IS
  'WebAuthn public credentials for internal platform operators. Private keys remain with the user authenticator.';
