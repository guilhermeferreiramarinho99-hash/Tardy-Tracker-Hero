ALTER TABLE public.alunos ALTER COLUMN escola_id SET NOT NULL;
ALTER TABLE public.turmas ALTER COLUMN escola_id SET NOT NULL;
ALTER TABLE public.periodos ALTER COLUMN escola_id SET NOT NULL;
ALTER TABLE public.atrasos ALTER COLUMN escola_id SET NOT NULL;
ALTER TABLE public.alertas ALTER COLUMN escola_id SET NOT NULL;
ALTER TABLE public.encaminhamentos ALTER COLUMN escola_id SET NOT NULL;
ALTER TABLE public.auditoria ALTER COLUMN escola_id SET NOT NULL;
ALTER TABLE public.user_roles ALTER COLUMN escola_id SET NOT NULL;

CREATE OR REPLACE FUNCTION public.corrigir_atraso(_id uuid, _justificado boolean, _motivo text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE a record; s uuid := public.minha_escola();
BEGIN
  IF NOT public.is_gestor(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão para corrigir registros'; END IF;
  IF coalesce(trim(_motivo),'') = '' THEN RAISE EXCEPTION 'Informe o motivo da correção'; END IF;
  SELECT * INTO a FROM public.atrasos WHERE escola_id = s AND id = _id AND NOT cancelado;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Registro não encontrado'; END IF;
  UPDATE public.atrasos SET justificado = _justificado WHERE escola_id = s AND id = _id;
  PERFORM public.auditar('Corrigiu atraso', jsonb_build_object('atraso', _id, 'data', a.data,
    'antes', a.justificado, 'depois', _justificado, 'motivo', _motivo,
    'aluno', (SELECT nome FROM public.alunos WHERE escola_id = s AND id = a.aluno_id)));
  PERFORM public.recalcular_alerta(a.aluno_id, a.data);
END;
$$;

CREATE OR REPLACE FUNCTION public.cancelar_atraso(_id uuid, _motivo text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE a record; s uuid := public.minha_escola();
BEGIN
  IF NOT public.is_gestor(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão para cancelar registros'; END IF;
  IF coalesce(trim(_motivo),'') = '' THEN RAISE EXCEPTION 'Informe o motivo do cancelamento'; END IF;
  SELECT * INTO a FROM public.atrasos WHERE escola_id = s AND id = _id AND NOT cancelado;
  IF a.id IS NULL THEN RAISE EXCEPTION 'Registro não encontrado'; END IF;
  UPDATE public.atrasos SET cancelado = true WHERE escola_id = s AND id = _id;
  PERFORM public.auditar('Cancelou atraso', jsonb_build_object('atraso', _id, 'data', a.data, 'motivo', _motivo,
    'aluno', (SELECT nome FROM public.alunos WHERE escola_id = s AND id = a.aluno_id)));
  PERFORM public.recalcular_alerta(a.aluno_id, a.data);
END;
$$;

CREATE OR REPLACE FUNCTION public.analisar_alerta(_id uuid, _texto text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE al record; s uuid := public.minha_escola();
BEGIN
  IF NOT public.is_gestor(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
  IF coalesce(trim(_texto),'') = '' THEN RAISE EXCEPTION 'Descreva o encaminhamento'; END IF;
  SELECT * INTO al FROM public.alertas WHERE escola_id = s AND id = _id;
  IF al.id IS NULL THEN RAISE EXCEPTION 'Alerta não encontrado'; END IF;
  INSERT INTO public.encaminhamentos (escola_id, alerta_id, aluno_id, texto, autor, autor_nome)
    VALUES (s, _id, al.aluno_id, left(trim(_texto),1000), auth.uid(), public.nome_usuario(auth.uid()));
  UPDATE public.alertas SET status = 'analisado' WHERE escola_id = s AND id = _id;
  PERFORM public.auditar('Analisou alerta', jsonb_build_object('alerta', _id));
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_atraso(_aluno uuid, _justificado boolean, _observacao text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE fz text; agora timestamp; r jsonb; nome_al text; s uuid := public.minha_escola();
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão para registrar atrasos'; END IF;
  SELECT nome INTO nome_al FROM public.alunos WHERE escola_id = s AND id = _aluno AND ativo;
  IF nome_al IS NULL THEN RAISE EXCEPTION 'Aluno não encontrado ou inativo'; END IF;
  SELECT fuso INTO fz FROM public.escola_config WHERE escola_id = s;
  IF fz IS NULL THEN RAISE EXCEPTION 'Configuração da escola não encontrada'; END IF;
  agora := now() AT TIME ZONE fz;
  IF EXISTS (SELECT 1 FROM public.atrasos WHERE escola_id = s AND aluno_id = _aluno AND data = agora::date AND NOT cancelado) THEN
    RAISE EXCEPTION 'Já existe um atraso registrado hoje para este aluno';
  END IF;
  INSERT INTO public.atrasos (escola_id, aluno_id, data, hora, justificado, observacao, registrado_por, registrado_por_nome)
  VALUES (s, _aluno, agora::date, date_trunc('minute', agora)::time, _justificado,
          nullif(left(trim(coalesce(_observacao,'')),200),''), auth.uid(), public.nome_usuario(auth.uid()));
  PERFORM public.auditar('Registrou atraso', jsonb_build_object('aluno', nome_al, 'justificado', _justificado));
  r := public.recalcular_alerta(_aluno, agora::date);
  RETURN r || jsonb_build_object('aluno', nome_al);
END;
$$;

CREATE OR REPLACE FUNCTION public.registrar_atraso_offline(_aluno uuid, _justificado boolean, _observacao text, _data date, _hora time)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE fz text; agora timestamp; hoje date; h time; r jsonb; nome_al text; s uuid := public.minha_escola();
BEGIN
  IF NOT public.is_staff(auth.uid()) THEN RAISE EXCEPTION 'Sem permissão para registrar atrasos'; END IF;
  SELECT nome INTO nome_al FROM public.alunos WHERE escola_id = s AND id = _aluno AND ativo;
  IF nome_al IS NULL THEN RAISE EXCEPTION 'Aluno não encontrado ou inativo'; END IF;
  IF _data IS NULL OR _hora IS NULL THEN RAISE EXCEPTION 'Informe a data e o horário do atraso'; END IF;
  SELECT fuso INTO fz FROM public.escola_config WHERE escola_id = s;
  IF fz IS NULL THEN RAISE EXCEPTION 'Configuração da escola não encontrada'; END IF;
  agora := now() AT TIME ZONE fz;
  hoje := agora::date;
  IF _data > hoje THEN RAISE EXCEPTION 'A data do atraso não pode estar no futuro'; END IF;
  IF _data < hoje - 15 THEN RAISE EXCEPTION 'A data do atraso é antiga demais (mais de 15 dias)'; END IF;
  h := _hora;
  IF _data = hoje AND h > date_trunc('minute', agora)::time THEN h := date_trunc('minute', agora)::time; END IF;
  IF EXISTS (SELECT 1 FROM public.atrasos WHERE escola_id = s AND aluno_id = _aluno AND data = _data AND NOT cancelado) THEN
    RAISE EXCEPTION 'Já existe um atraso registrado nesta data para este aluno';
  END IF;
  INSERT INTO public.atrasos (escola_id, aluno_id, data, hora, justificado, observacao, registrado_por, registrado_por_nome)
  VALUES (s, _aluno, _data, h, _justificado, nullif(left(trim(coalesce(_observacao,'')),200),''), auth.uid(), public.nome_usuario(auth.uid()));
  PERFORM public.auditar('Registrou atraso enviado sem internet',
    jsonb_build_object('aluno', nome_al, 'justificado', _justificado, 'data', _data, 'hora', h));
  r := public.recalcular_alerta(_aluno, _data);
  RETURN r || jsonb_build_object('aluno', nome_al);
END;
$$;