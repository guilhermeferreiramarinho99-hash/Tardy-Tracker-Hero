CREATE OR REPLACE FUNCTION public.excluir_periodo(_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _nome text;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Apenas a administração pode excluir bimestres.'; END IF;
  SELECT nome INTO _nome FROM public.periodos WHERE escola_id=public.minha_escola() AND id=_id;
  IF _nome IS NULL THEN RAISE EXCEPTION 'Bimestre não encontrado.'; END IF;
  IF EXISTS (SELECT 1 FROM public.alertas WHERE periodo_id=_id) THEN
    RAISE EXCEPTION 'Este bimestre tem alertas da coordenação. Para preservar o histórico, ajuste as datas em vez de excluir.';
  END IF;
  DELETE FROM public.periodos WHERE escola_id=public.minha_escola() AND id=_id;
  PERFORM public.auditar('Excluiu bimestre', jsonb_build_object('bimestre',_nome));
END $$;
REVOKE ALL ON FUNCTION public.excluir_periodo(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.excluir_periodo(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.excluir_escola(_confirmacao text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e uuid := public.minha_escola(); _nome text;
BEGIN
  IF e IS NULL OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Apenas a administração da escola pode excluí-la.'; END IF;
  SELECT nome INTO _nome FROM public.escolas WHERE id=e;
  IF public.normalizar_nome(coalesce(_confirmacao,'')) <> public.normalizar_nome(_nome) THEN
    RAISE EXCEPTION 'Digite o nome da escola exatamente para confirmar.';
  END IF;
  DELETE FROM public.encaminhamentos WHERE escola_id=e;
  DELETE FROM public.alertas WHERE escola_id=e;
  DELETE FROM public.atrasos WHERE escola_id=e;
  DELETE FROM public.alunos WHERE escola_id=e;
  DELETE FROM public.turmas WHERE escola_id=e;
  DELETE FROM public.periodos WHERE escola_id=e;
  DELETE FROM public.convites WHERE escola_id=e;
  DELETE FROM public.escola_convites WHERE escola_id=e;
  DELETE FROM public.escola_config WHERE escola_id=e;
  DELETE FROM public.auditoria WHERE escola_id=e;
  DELETE FROM public.user_roles WHERE escola_id=e;
  DELETE FROM public.escola_membros WHERE escola_id=e;
  DELETE FROM public.escolas WHERE id=e;
END $$;
REVOKE ALL ON FUNCTION public.excluir_escola(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.excluir_escola(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.importar_alunos(_turma uuid, _lista jsonb) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE e uuid := public.minha_escola(); item jsonb; c text; n text; ok int := 0; pulados jsonb := '[]'::jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Apenas a administração pode importar alunos.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.turmas WHERE id=_turma AND escola_id=e) THEN RAISE EXCEPTION 'Turma não encontrada.'; END IF;
  IF jsonb_typeof(_lista) <> 'array' OR jsonb_array_length(_lista) > 300 THEN RAISE EXCEPTION 'Envie no máximo 300 alunos por vez.'; END IF;
  FOR item IN SELECT * FROM jsonb_array_elements(_lista) LOOP
    c := trim(coalesce(item->>'codigo','')); n := regexp_replace(trim(coalesce(item->>'nome','')),'\s+',' ','g');
    IF c = '' OR char_length(n) < 3 OR char_length(c) > 40 OR char_length(n) > 150 THEN
      pulados := pulados || jsonb_build_object('codigo',c,'nome',n,'motivo','Código ou nome inválido');
    ELSIF EXISTS (SELECT 1 FROM public.alunos WHERE escola_id=e AND codigo=c) THEN
      pulados := pulados || jsonb_build_object('codigo',c,'nome',n,'motivo','Código já cadastrado');
    ELSIF EXISTS (SELECT 1 FROM public.alunos WHERE escola_id=e AND public.normalizar_nome(nome)=public.normalizar_nome(n)) THEN
      pulados := pulados || jsonb_build_object('codigo',c,'nome',n,'motivo','Nome já cadastrado');
    ELSE
      INSERT INTO public.alunos(codigo,nome,turma_id,escola_id) VALUES(c,n,_turma,e);
      ok := ok + 1;
    END IF;
  END LOOP;
  PERFORM public.auditar('Importou alunos', jsonb_build_object('quantidade',ok));
  RETURN jsonb_build_object('cadastrados',ok,'pulados',pulados);
END $$;
REVOKE ALL ON FUNCTION public.importar_alunos(uuid,jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.importar_alunos(uuid,jsonb) TO authenticated;