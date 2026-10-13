
revoke execute on function public.has_role(uuid, public.app_role), public.is_staff(uuid), public.is_gestor(uuid),
  public.nome_usuario(uuid) from public, anon;
revoke execute on function public.nome_usuario(uuid) from authenticated;
