
-- Defesa extra: nenhum acesso anônimo e apenas os privilégios necessários
revoke all on public.profiles, public.user_roles, public.turmas, public.alunos, public.periodos,
  public.config, public.atrasos, public.alertas, public.encaminhamentos, public.auditoria from anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select, insert, update, delete on public.turmas to authenticated;
grant select, insert, update on public.alunos to authenticated;
grant select, insert, update, delete on public.periodos to authenticated;
grant select, update on public.config to authenticated;
grant select on public.atrasos, public.alertas, public.encaminhamentos, public.auditoria to authenticated;

revoke execute on function public.recalcular_alerta(uuid, date), public.auditar(text, jsonb),
  public.handle_new_user(), public.trg_auditoria() from public, anon, authenticated;
