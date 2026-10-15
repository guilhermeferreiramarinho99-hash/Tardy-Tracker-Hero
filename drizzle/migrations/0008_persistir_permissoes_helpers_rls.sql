-- Preserve the existing hosted grants when replaying migrations in tests or a fresh environment.
-- These role checks are required by RLS; anonymous execution remains denied.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role), public.is_staff(uuid), public.is_gestor(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role), public.is_staff(uuid), public.is_gestor(uuid) FROM PUBLIC, anon;