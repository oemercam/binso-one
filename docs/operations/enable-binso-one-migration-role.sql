-- One-time administration for the private production migration slot.
-- Run in binso_platform using the existing administrator.
BEGIN;
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';
SET LOCAL ROLE binsoadmin;
SELECT pg_advisory_xact_lock(hashtextextended('binso:canonical:migrations', 0));

DO $scope$
BEGIN
  IF current_database() <> 'binso_platform'
    OR NOT EXISTS (
      SELECT 1 FROM pg_roles
      WHERE rolname = 'binso_one_migrations' AND rolcanlogin
        AND NOT (rolsuper OR rolcreatedb OR rolcreaterole OR rolbypassrls OR rolreplication)
    )
    OR NOT EXISTS (
      SELECT 1 FROM public.schema_migrations WHERE version = '0117_operator_password_passkeys.sql'
    )
  THEN
    RAISE EXCEPTION 'Unexpected Binso One migration target';
  END IF;
END
$scope$;

GRANT USAGE, CREATE ON SCHEMA public TO binso_one_migrations;
CREATE SCHEMA IF NOT EXISTS binso_release_control AUTHORIZATION binsoadmin;
REVOKE ALL ON SCHEMA binso_release_control FROM PUBLIC;
GRANT USAGE ON SCHEMA binso_release_control TO binso_one_migrations;

-- Preserve the existing lifecycle checks for the slot without granting it a
-- server-wide BYPASSRLS attribute. The fixed query returns counts only.
CREATE OR REPLACE FUNCTION binso_release_control.preflight()
RETURNS TABLE (
  ambiguous_active_identities bigint,
  foreign_pending_invitations bigint,
  active_companies_without_owner bigint,
  existing_checkouts_during_free_trial bigint
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = pg_catalog
SET row_security = off
AS $checks$
  SELECT
    (SELECT count(*) FROM (
      SELECT user_id FROM public.organization_memberships WHERE status = 'active'
      GROUP BY user_id HAVING count(*) > 1
    ) AS identities),
    (SELECT count(*) FROM public.organization_invitations i
      JOIN public.app_users u ON lower(u.email) = lower(i.email)
      WHERE i.status = 'pending' AND i.expires_at > now() AND EXISTS (
        SELECT 1 FROM public.organization_memberships m
        WHERE m.user_id = u.id AND m.organization_id <> i.organization_id
      )),
    (SELECT count(*) FROM public.organizations o
      WHERE o.status IN ('active','trial','grace_period') AND NOT o.is_demo AND NOT EXISTS (
        SELECT 1 FROM public.organization_memberships m
        WHERE m.organization_id = o.id AND m.role = 'owner' AND m.status = 'active'
      )),
    (SELECT count(*) FROM public.billing_checkout_sessions b
      JOIN public.organization_subscriptions s ON s.organization_id = b.organization_id
      WHERE b.expires_at > now() AND s.status = 'trial'
        AND (s.trial_until IS NULL OR s.trial_until > now()));
$checks$;
REVOKE ALL ON FUNCTION binso_release_control.preflight() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION binso_release_control.preflight() TO binso_one_migrations;

DO $objects$
DECLARE
  object record;
BEGIN
  FOR object IN
    SELECT c.relname, c.relkind
    FROM pg_class c
    WHERE c.relnamespace = 'public'::regnamespace
      AND c.relowner = 'binsoadmin'::regrole
      AND c.relkind IN ('r', 'p', 'S')
      AND NOT EXISTS (
        SELECT 1 FROM pg_depend d
        WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid
          AND (d.deptype = 'e' OR (c.relkind = 'S' AND d.deptype IN ('a', 'i')))
      )
    ORDER BY c.relkind = 'S', c.relname
  LOOP
    EXECUTE format('ALTER %s public.%I OWNER TO binso_one_migrations',
      CASE WHEN object.relkind = 'S' THEN 'SEQUENCE' ELSE 'TABLE' END, object.relname);
  END LOOP;
END
$objects$;

-- Preserve the former owner's access, including access used by existing views
-- and security-definer routines. Their owners and runtime grants stay in place.
SET LOCAL ROLE binso_one_migrations;
DO $acl$
DECLARE
  object record;
BEGIN
  FOR object IN
    SELECT relname, relkind
    FROM pg_class
    WHERE relnamespace = 'public'::regnamespace
      AND relowner = 'binso_one_migrations'::regrole AND relkind IN ('r', 'p', 'S')
  LOOP
    EXECUTE format('GRANT ALL ON %s public.%I TO binsoadmin WITH GRANT OPTION',
      CASE WHEN object.relkind = 'S' THEN 'SEQUENCE' ELSE 'TABLE' END, object.relname);
  END LOOP;
END
$acl$;

-- Run the same SELECT from the restricted migration identity before committing.
SELECT * FROM binso_release_control.preflight();
COMMIT;
