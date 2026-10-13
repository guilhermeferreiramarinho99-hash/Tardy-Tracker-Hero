-- One immutable school membership per individual account; preserve existing data.
CREATE TABLE public.escolas (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), nome text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.escolas TO authenticated;
GRANT ALL ON public.escolas TO service_role;
ALTER TABLE public.escolas ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.escola_membros (user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE, escola_id uuid NOT NULL REFERENCES public.escolas(id), created_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT ON public.escola_membros TO authenticated;
GRANT ALL ON public.escola_membros TO service_role;
ALTER TABLE public.escola_membros ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.escola_convites (escola_id uuid PRIMARY KEY REFERENCES public.escolas(id), codigo text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text,'-',''));
GRANT SELECT ON public.escola_convites TO authenticated;
GRANT ALL ON public.escola_convites TO service_role;
ALTER TABLE public.escola_convites ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.escola_config (escola_id uuid PRIMARY KEY REFERENCES public.escolas(id), limite integer NOT NULL DEFAULT 3 CHECK(limite BETWEEN 1 AND 50), contar_justificados boolean NOT NULL DEFAULT true, fuso text NOT NULL DEFAULT 'America/Campo_Grande');
GRANT SELECT,UPDATE ON public.escola_config TO authenticated;
GRANT ALL ON public.escola_config TO service_role;
ALTER TABLE public.escola_config ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.minha_escola() RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT escola_id FROM public.escola_membros WHERE user_id=auth.uid() $$;
REVOKE ALL ON FUNCTION public.minha_escola() FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.minha_escola() TO authenticated;
-- This is the legacy school's identity, not a new sample school.
INSERT INTO public.escolas(id,nome) SELECT '00000000-0000-4000-8000-000000000001'::uuid,'Minha escola' WHERE EXISTS(SELECT 1 FROM public.profiles);
INSERT INTO public.escola_membros(user_id,escola_id) SELECT id,'00000000-0000-4000-8000-000000000001'::uuid FROM public.profiles;
INSERT INTO public.escola_convites(escola_id) SELECT id FROM public.escolas;
INSERT INTO public.escola_config(escola_id,limite,contar_justificados,fuso) SELECT e.id,c.limite,c.contar_justificados,c.fuso FROM public.escolas e CROSS JOIN public.config c WHERE c.id=1;
DO $$ DECLARE t text; BEGIN
 FOREACH t IN ARRAY ARRAY['user_roles','turmas','alunos','periodos','atrasos','alertas','encaminhamentos','auditoria'] LOOP
  EXECUTE format('ALTER TABLE public.%I ADD COLUMN escola_id uuid REFERENCES public.escolas(id) DEFAULT public.minha_escola()',t);
  EXECUTE format('UPDATE public.%I SET escola_id=''00000000-0000-4000-8000-000000000001''::uuid WHERE escola_id IS NULL',t);
  EXECUTE format('CREATE INDEX %I ON public.%I(escola_id)',t||'_escola_idx',t);
  EXECUTE format('CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING(escola_id=public.minha_escola()) WITH CHECK(escola_id=public.minha_escola())',t||'_isolamento_escola',t);
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid,_role public.app_role) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.user_roles r JOIN public.escola_membros m ON m.user_id=r.user_id AND m.escola_id=r.escola_id WHERE r.user_id=_user_id AND r.role=_role AND r.escola_id=public.minha_escola()) $$;
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.has_role(_user_id,'admin') OR public.has_role(_user_id,'equipe') OR public.has_role(_user_id,'coordenacao') $$;
CREATE OR REPLACE FUNCTION public.is_gestor(_user_id uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT public.has_role(_user_id,'admin') OR public.has_role(_user_id,'coordenacao') $$;
CREATE POLICY escolas_leitura ON public.escolas FOR SELECT TO authenticated USING(id=public.minha_escola());
CREATE POLICY membros_leitura ON public.escola_membros FOR SELECT TO authenticated USING(user_id=auth.uid() OR (escola_id=public.minha_escola() AND public.has_role(auth.uid(),'admin')));
CREATE POLICY convites_admin ON public.escola_convites FOR SELECT TO authenticated USING(escola_id=public.minha_escola() AND public.has_role(auth.uid(),'admin'));
CREATE POLICY regras_leitura ON public.escola_config FOR SELECT TO authenticated USING(escola_id=public.minha_escola() AND public.is_staff(auth.uid()));
CREATE POLICY regras_admin ON public.escola_config FOR UPDATE TO authenticated USING(escola_id=public.minha_escola() AND public.has_role(auth.uid(),'admin')) WITH CHECK(escola_id=public.minha_escola() AND public.has_role(auth.uid(),'admin'));
CREATE POLICY profiles_isolamento ON public.profiles AS RESTRICTIVE FOR SELECT TO authenticated USING(id=auth.uid() OR EXISTS(SELECT 1 FROM public.escola_membros m WHERE m.user_id=profiles.id AND m.escola_id=public.minha_escola()));
-- Retire singleton configuration without deleting the legacy table.
CREATE POLICY config_legado_bloqueado ON public.config AS RESTRICTIVE FOR ALL TO authenticated USING(false) WITH CHECK(false);
COMMENT ON TABLE public.config IS 'DEPRECATED: replaced by escola_config; legacy snapshot preserved';
-- Same names/codes may legitimately occur at different schools.
ALTER TABLE public.turmas DROP CONSTRAINT turmas_nome_key;
CREATE UNIQUE INDEX turmas_nome_por_escola ON public.turmas(escola_id,nome);
ALTER TABLE public.alunos DROP CONSTRAINT alunos_codigo_key;
CREATE UNIQUE INDEX alunos_codigo_por_escola ON public.alunos(escola_id,codigo);
DROP INDEX public.alunos_nome_unico;
CREATE UNIQUE INDEX alunos_nome_por_escola ON public.alunos(escola_id,lower(nome));
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 INSERT INTO public.profiles(id,nome,email) VALUES(new.id,coalesce(new.raw_user_meta_data->>'nome',new.raw_user_meta_data->>'full_name',''),new.email);
 RETURN new; END $$;
CREATE OR REPLACE FUNCTION public.nome_usuario(_uid uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT coalesce(nullif(p.nome,''),p.email,'Usuário') FROM public.profiles p WHERE p.id=_uid AND (p.id=auth.uid() OR EXISTS(SELECT 1 FROM public.escola_membros m WHERE m.user_id=p.id AND m.escola_id=public.minha_escola())) $$;
-- Definer writes also enforce tenant identity and same-school relationships.
CREATE FUNCTION public.validar_escola_registro() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s uuid:=public.minha_escola(); r jsonb; alvo uuid; BEGIN
 r:=CASE WHEN TG_OP='DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
 IF auth.uid() IS NOT NULL AND (s IS NULL OR (r->>'escola_id')::uuid IS DISTINCT FROM s) THEN RAISE EXCEPTION 'Sem permissão para acessar dados de outra escola'; END IF;
 IF TG_OP='UPDATE' AND OLD.escola_id IS DISTINCT FROM NEW.escola_id THEN RAISE EXCEPTION 'A escola do registro não pode ser alterada'; END IF;
 IF TG_OP<>'DELETE' THEN
  IF TG_TABLE_NAME='alunos' THEN
   IF NOT EXISTS(SELECT 1 FROM public.turmas WHERE id=(r->>'turma_id')::uuid AND escola_id=NEW.escola_id) THEN RAISE EXCEPTION 'Turma não pertence à escola'; END IF;
   IF r->>'user_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.escola_membros WHERE user_id=(r->>'user_id')::uuid AND escola_id=NEW.escola_id) THEN RAISE EXCEPTION 'Conta não pertence à escola'; END IF;
  ELSIF TG_TABLE_NAME='user_roles' THEN
   IF NOT EXISTS(SELECT 1 FROM public.escola_membros WHERE user_id=(r->>'user_id')::uuid AND escola_id=NEW.escola_id) THEN RAISE EXCEPTION 'Conta não pertence à escola'; END IF;
  ELSIF TG_TABLE_NAME IN ('atrasos','alertas','encaminhamentos') THEN
   IF NOT EXISTS(SELECT 1 FROM public.alunos WHERE id=(r->>'aluno_id')::uuid AND escola_id=NEW.escola_id) THEN RAISE EXCEPTION 'Aluno não pertence à escola'; END IF;
   IF TG_TABLE_NAME='alertas' AND NOT EXISTS(SELECT 1 FROM public.periodos WHERE id=(r->>'periodo_id')::uuid AND escola_id=NEW.escola_id) THEN RAISE EXCEPTION 'Bimestre não pertence à escola'; END IF;
   IF TG_TABLE_NAME='encaminhamentos' AND r->>'alerta_id' IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.alertas WHERE id=(r->>'alerta_id')::uuid AND aluno_id=(r->>'aluno_id')::uuid AND escola_id=NEW.escola_id) THEN RAISE EXCEPTION 'Alerta não pertence ao aluno desta escola'; END IF;
  END IF;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validar_escola_registro() FROM PUBLIC,anon,authenticated;
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['user_roles','turmas','alunos','periodos','atrasos','alertas','encaminhamentos','auditoria'] LOOP
 EXECUTE format('CREATE TRIGGER validar_escola BEFORE INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.validar_escola_registro()',t);
END LOOP; END $$;
CREATE OR REPLACE FUNCTION public.recalcular_alerta(_aluno uuid,_data date) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE p record; c record; qtd int; novo boolean:=false; s uuid:=public.minha_escola(); BEGIN
 IF NOT public.is_staff(auth.uid()) OR NOT EXISTS(SELECT 1 FROM public.alunos WHERE id=_aluno AND escola_id=s) THEN RAISE EXCEPTION 'Sem permissão'; END IF;
 SELECT * INTO c FROM public.escola_config WHERE escola_id=s;
 SELECT * INTO p FROM public.periodos WHERE escola_id=s AND _data BETWEEN inicio AND fim ORDER BY inicio LIMIT 1;
 IF p.id IS NULL THEN RETURN jsonb_build_object('quantidade',0,'alerta_novo',false); END IF;
 SELECT count(*) INTO qtd FROM public.atrasos WHERE escola_id=s AND aluno_id=_aluno AND NOT cancelado AND data BETWEEN p.inicio AND p.fim AND (c.contar_justificados OR NOT justificado);
 IF qtd>=c.limite THEN INSERT INTO public.alertas(escola_id,aluno_id,periodo_id,quantidade) VALUES(s,_aluno,p.id,qtd) ON CONFLICT(aluno_id,periodo_id) DO NOTHING; novo:=found; END IF;
 UPDATE public.alertas SET quantidade=qtd WHERE escola_id=s AND aluno_id=_aluno AND periodo_id=p.id;
 RETURN jsonb_build_object('quantidade',qtd,'alerta_novo',novo,'limite',c.limite,'periodo',p.nome);
END $$;
-- Scope all existing official RPC lookups before any read or mutation.
DO $$ DECLARE n text; d text; BEGIN
 FOREACH n IN ARRAY ARRAY['registrar_atraso','registrar_atraso_offline','corrigir_atraso','cancelar_atraso','analisar_alerta','excluir_aluno'] LOOP
  SELECT pg_get_functiondef(p.oid) INTO d FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace WHERE ns.nspname='public' AND p.proname=n;
  d:=replace(d,'from public.alunos where id = _aluno and ativo','from public.alunos where escola_id = public.minha_escola() and id = _aluno and ativo');
  d:=replace(d,'FROM public.alunos WHERE id = _id','FROM public.alunos WHERE escola_id = public.minha_escola() AND id = _id');
  d:=replace(d,'from public.atrasos where id = _id','from public.atrasos where escola_id = public.minha_escola() and id = _id');
  d:=replace(d,'from public.alertas where id = _id','from public.alertas where escola_id = public.minha_escola() and id = _id');
  d:=replace(d,'from public.config where id = 1','from public.escola_config where escola_id = public.minha_escola()');
  EXECUTE d;
 END LOOP;
END $$;
CREATE OR REPLACE FUNCTION public.definir_papel(_user uuid,_role public.app_role,_ativo boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Somente administradores'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.escola_membros WHERE user_id=_user AND escola_id=public.minha_escola()) THEN RAISE EXCEPTION 'Conta não pertence à sua escola'; END IF;
 IF _user=auth.uid() AND _role='admin' AND NOT _ativo THEN RAISE EXCEPTION 'Você não pode remover seu próprio acesso de administrador'; END IF;
 IF _ativo THEN INSERT INTO public.user_roles(user_id,role) VALUES(_user,_role) ON CONFLICT DO NOTHING;
 ELSE DELETE FROM public.user_roles WHERE user_id=_user AND role=_role AND escola_id=public.minha_escola(); END IF;
 PERFORM public.auditar(CASE WHEN _ativo THEN 'Concedeu perfil' ELSE 'Removeu perfil' END,jsonb_build_object('usuario',public.nome_usuario(_user),'perfil',_role)); END $$;
CREATE OR REPLACE FUNCTION public.vincular_aluno(_aluno uuid,_user uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Somente administradores'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.alunos WHERE id=_aluno AND escola_id=public.minha_escola()) THEN RAISE EXCEPTION 'Aluno não encontrado'; END IF;
 IF _user IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.escola_membros WHERE user_id=_user AND escola_id=public.minha_escola()) THEN RAISE EXCEPTION 'Conta não pertence à escola'; END IF;
 UPDATE public.alunos SET user_id=NULL WHERE user_id=_user AND escola_id=public.minha_escola();
 UPDATE public.alunos SET user_id=_user WHERE id=_aluno AND escola_id=public.minha_escola();
 IF _user IS NOT NULL THEN INSERT INTO public.user_roles(user_id,role) VALUES(_user,'aluno') ON CONFLICT DO NOTHING; END IF;
 PERFORM public.auditar('Vinculou conta ao aluno',jsonb_build_object('aluno',_aluno,'usuario',_user)); END $$;
CREATE FUNCTION public.criar_escola(_nome text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE s uuid; BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Entre na sua conta'; END IF;
 PERFORM 1 FROM public.profiles WHERE id=auth.uid() FOR UPDATE;
 IF public.minha_escola() IS NOT NULL THEN RAISE EXCEPTION 'Sua conta já está vinculada a uma escola'; END IF;
 IF char_length(trim(coalesce(_nome,''))) NOT BETWEEN 3 AND 120 THEN RAISE EXCEPTION 'Informe o nome da escola (3 a 120 caracteres)'; END IF;
 INSERT INTO public.escolas(nome) VALUES(trim(_nome)) RETURNING id INTO s;
 INSERT INTO public.escola_membros(user_id,escola_id) VALUES(auth.uid(),s);
 INSERT INTO public.escola_convites(escola_id) VALUES(s);
 INSERT INTO public.escola_config(escola_id) VALUES(s);
 INSERT INTO public.user_roles(user_id,role,escola_id) VALUES(auth.uid(),'admin',s);
 PERFORM public.auditar('Cadastrou escola',jsonb_build_object('escola',trim(_nome)));
 RETURN s; END $$;
CREATE FUNCTION public.entrar_escola(_codigo text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE s uuid; BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Entre na sua conta'; END IF;
 PERFORM 1 FROM public.profiles WHERE id=auth.uid() FOR UPDATE;
 IF public.minha_escola() IS NOT NULL THEN RAISE EXCEPTION 'Sua conta já está vinculada a uma escola'; END IF;
 SELECT escola_id INTO s FROM public.escola_convites WHERE codigo=lower(trim(_codigo));
 IF s IS NULL THEN RAISE EXCEPTION 'Código de escola inválido'; END IF;
 INSERT INTO public.escola_membros(user_id,escola_id) VALUES(auth.uid(),s);
 PERFORM public.auditar('Solicitou acesso à escola',jsonb_build_object('usuario',public.nome_usuario(auth.uid())));
 END $$;
CREATE FUNCTION public.atualizar_escola(_nome text,_renovar_codigo boolean DEFAULT false) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Somente administradores'; END IF;
 IF char_length(trim(coalesce(_nome,''))) NOT BETWEEN 3 AND 120 THEN RAISE EXCEPTION 'Informe o nome da escola (3 a 120 caracteres)'; END IF;
 UPDATE public.escolas SET nome=trim(_nome) WHERE id=public.minha_escola();
 IF _renovar_codigo THEN UPDATE public.escola_convites SET codigo=replace(gen_random_uuid()::text,'-','') WHERE escola_id=public.minha_escola(); END IF;
 PERFORM public.auditar('Atualizou escola',jsonb_build_object('escola',trim(_nome),'renovou_codigo',_renovar_codigo)); END $$;
REVOKE ALL ON FUNCTION public.criar_escola(text),public.entrar_escola(text),public.atualizar_escola(text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.criar_escola(text),public.entrar_escola(text),public.atualizar_escola(text,boolean) TO authenticated;
CREATE TRIGGER aud_escola_config AFTER UPDATE ON public.escola_config FOR EACH ROW EXECUTE FUNCTION public.trg_auditoria();