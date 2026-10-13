CREATE OR REPLACE FUNCTION public.excluir_aluno(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _nome text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas a administração pode excluir alunos.';
  END IF;
  SELECT nome INTO _nome FROM public.alunos WHERE id = _id;
  IF _nome IS NULL THEN
    RAISE EXCEPTION 'Aluno não encontrado.';
  END IF;
  IF EXISTS (SELECT 1 FROM public.atrasos WHERE aluno_id = _id)
     OR EXISTS (SELECT 1 FROM public.alertas WHERE aluno_id = _id)
     OR EXISTS (SELECT 1 FROM public.encaminhamentos WHERE aluno_id = _id) THEN
    RAISE EXCEPTION 'Este aluno tem registros de atraso. Para preservar o histórico, marque-o como Inativo em vez de excluir.';
  END IF;
  DELETE FROM public.alunos WHERE id = _id;
  PERFORM public.auditar('excluir_aluno', jsonb_build_object('aluno', _nome));
END;
$$;

GRANT EXECUTE ON FUNCTION public.excluir_aluno(uuid) TO authenticated;