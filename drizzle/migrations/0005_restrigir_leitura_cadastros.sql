-- Restringe a leitura de cadastros internos.
-- turmas: a equipe continua vendo todas; o aluno passa a ver apenas a própria turma.
-- config: regras internas da escola (limite de atrasos, fuso), só a equipe lê.
-- periodos: calendário escolar, continua visível a quem tem conta, porque o aluno
-- precisa escolher o bimestre no próprio histórico.

drop policy if exists "turmas leitura" on public.turmas;
create policy "turmas leitura" on public.turmas
  for select to authenticated
  using (
    public.is_staff(auth.uid())
    or exists (
      select 1 from public.alunos a
      where a.user_id = auth.uid()
        and a.turma_id = turmas.id
    )
  );

drop policy if exists "config leitura" on public.config;
create policy "config leitura" on public.config
  for select to authenticated
  using (public.is_staff(auth.uid()));
