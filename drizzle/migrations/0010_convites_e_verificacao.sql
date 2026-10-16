CREATE TABLE public.convites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escola_id uuid NOT NULL REFERENCES public.escolas(id),
  codigo text NOT NULL UNIQUE,
  papel public.app_role NOT NULL,
  criado_por uuid,
  criado_em timestamptz NOT NULL DEFAULT now(),
  expira_em timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  usado_em timestamptz,
  usado_por uuid
);
GRANT SELECT ON public.convites TO authenticated;
GRANT ALL ON public.convites TO service_role;
ALTER TABLE public.convites ENABLE ROW LEVEL SECURITY;
CREATE POLICY convites_leitura ON public.convites FOR SELECT TO authenticated
  USING(escola_id=public.minha_escola() AND public.has_role(auth.uid(),'admin'));
CREATE TRIGGER validar_escola BEFORE INSERT OR UPDATE OR DELETE ON public.convites
  FOR EACH ROW EXECUTE FUNCTION public.validar_escola_registro();
CREATE INDEX IF NOT EXISTS convites_escola_idx ON public.convites(escola_id);

CREATE FUNCTION public.normalizar_nome(_t text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
 SELECT trim(regexp_replace(translate(lower(coalesce(_t,'')),'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ','aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn'),'[[:space:]]+',' ','g'))
$$;

CREATE FUNCTION public.eh_superadmin(_user uuid DEFAULT NULL) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT EXISTS(SELECT 1 FROM public.user_roles WHERE user_id=coalesce(_user,auth.uid()) AND role='superadmin')
$$;
REVOKE ALL ON FUNCTION public.eh_superadmin(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.eh_superadmin(uuid) TO authenticated;

-- Escola criada pelo formulário público: fica aguardando verificação, sem liberar acesso.
CREATE FUNCTION public.cadastrar_escola_completa(_nome text,_email_institucional text,_endereco text,_cidade text,_estado text,_cep text,_telefone text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s uuid; n text; c text; e uuid; BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Entre na sua conta'; END IF;
 PERFORM 1 FROM public.profiles WHERE id=auth.uid() FOR UPDATE;
 IF public.minha_escola() IS NOT NULL THEN RAISE EXCEPTION 'Sua conta já está vinculada a uma escola'; END IF;
 n:=public.normalizar_nome(_nome); c:=trim(coalesce(_cidade,'')); e:=upper(trim(coalesce(_estado,'')));
 IF length(trim(coalesce(_nome,''))) NOT BETWEEN 3 AND 120 THEN RAISE EXCEPTION 'Informe o nome oficial da escola (3 a 120 caracteres)'; END IF;
 IF n = '' THEN RAISE EXCEPTION 'Informe o nome oficial da escola'; END IF;
 IF coalesce(_email_institucional,'') !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN RAISE EXCEPTION 'Informe um e-mail institucional válido'; END IF;
 IF c = '' OR e = '' OR length(e)<>2 THEN RAISE EXCEPTION 'Informe cidade e estado (sigla com duas letras)'; END IF;
 SELECT id INTO s FROM public.escolas WHERE public.normalizar_nome(nome)=n AND public.normalizar_nome(cidade)=public.normalizar_nome(c) AND upper(estado)=e LIMIT 1;
 IF s IS NOT NULL THEN RAISE EXCEPTION 'Já existe uma escola cadastrada com esse nome nesta cidade. Procure a administração do sistema.'; END IF;
 INSERT INTO public.escolas(nome,email_institucional,endereco,cidade,estado,cep,telefone,status,admin_pendente)
  VALUES(trim(_nome),trim(_email_institucional),trim(coalesce(_endereco,'')),c,e,trim(coalesce(_cep,'')),trim(coalesce(_telefone,'')),'aguardando',auth.uid()) RETURNING id INTO s;
 INSERT INTO public.escola_membros(user_id,escola_id) VALUES(auth.uid(),s);
 PERFORM public.auditar('Cadastrou escola — aguardando verificação',jsonb_build_object('escola',trim(_nome),'cidade',c,'estado',e));
 RETURN s; END $$;

-- Verificação feita pela administração geral do sistema.
CREATE FUNCTION public.verificar_escola(_escola uuid,_aprovar boolean) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE resp uuid; BEGIN
 IF NOT public.eh_superadmin() THEN RAISE EXCEPTION 'Somente a administração geral do sistema pode verificar escolas'; END IF;
 SELECT admin_pendente INTO resp FROM public.escolas WHERE id=_escola;
 IF _aprovar THEN
  UPDATE public.escolas SET status='ativa' WHERE id=_escola;
  IF resp IS NOT NULL THEN
   INSERT INTO public.escola_membros(user_id,escola_id) VALUES(resp,_escola) ON CONFLICT DO NOTHING;
   INSERT INTO public.user_roles(user_id,role,escola_id) VALUES(resp,'admin',_escola) ON CONFLICT DO NOTHING;
  END IF;
  INSERT INTO public.escola_convites(escola_id) VALUES(_escola) ON CONFLICT DO NOTHING;
  INSERT INTO public.escola_config(escola_id) VALUES(_escola) ON CONFLICT DO NOTHING;
 ELSE
  UPDATE public.escolas SET status='recusada' WHERE id=_escola;
 END IF;
 PERFORM public.auditar(CASE WHEN _aprovar THEN 'Verificou e aprovou escola' ELSE 'Verificou e recusou escola' END,jsonb_build_object('escola',_escola));
END $$;

CREATE FUNCTION public.listar_escolas_pendentes() RETURNS TABLE(escola_id uuid, nome text, email_institucional text, endereco text, cidade text, estado text, cep text, telefone text, responsavel text, responsavel_email text, criado_em timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT e.id,e.nome,e.email_institucional,e.endereco,e.cidade,e.estado,e.cep,e.telefone,coalesce(p.nome,''),coalesce(p.email,''),e.created_at
 FROM public.escolas e LEFT JOIN public.profiles p ON p.id=e.admin_pendente
 WHERE e.status='aguardando' AND public.eh_superadmin() ORDER BY e.created_at
$$;

-- Convite de uso único, temporário e já associado a um perfil.
CREATE FUNCTION public.gerar_convite(_papel public.app_role) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE s uuid:=public.minha_escola(); c text; BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Somente administradores'; END IF;
 IF _papel NOT IN ('equipe','coordenacao','aluno') THEN RAISE EXCEPTION 'Perfil de convite inválido'; END IF;
 c:=substring(replace(gen_random_uuid()::text,'-','') FROM 1 FOR 12);
 INSERT INTO public.convites(escola_id,codigo,papel,criado_por) VALUES(s,c,_papel,auth.uid());
 PERFORM public.auditar('Gerou convite de acesso',jsonb_build_object('perfil',_papel));
 RETURN c; END $$;

CREATE FUNCTION public.revogar_convite(_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Somente administradores'; END IF;
 UPDATE public.convites SET expira_em=now() WHERE id=_id AND escola_id=public.minha_escola() AND usado_em IS NULL;
 PERFORM public.auditar('Revogou convite de acesso',jsonb_build_object('convite',_id)); END $$;

CREATE FUNCTION public.resgatar_convite(_codigo text) RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v record; BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Entre na sua conta'; END IF;
 PERFORM 1 FROM public.profiles WHERE id=auth.uid() FOR UPDATE;
 IF public.minha_escola() IS NOT NULL THEN RAISE EXCEPTION 'Sua conta já está vinculada a uma escola'; END IF;
 SELECT * INTO v FROM public.convites WHERE codigo=lower(trim(_codigo)) FOR UPDATE;
 IF v.id IS NULL OR v.usado_em IS NOT NULL OR v.expira_em < now() THEN RAISE EXCEPTION 'Convite inválido, já utilizado ou expirado'; END IF;
 INSERT INTO public.escola_membros(user_id,escola_id) VALUES(auth.uid(),v.escola_id);
 INSERT INTO public.user_roles(user_id,role,escola_id) VALUES(auth.uid(),v.papel,v.escola_id);
 UPDATE public.convites SET usado_em=now(), usado_por=auth.uid() WHERE id=v.id;
 PERFORM public.auditar('Resgatou convite de acesso',jsonb_build_object('perfil',v.papel));
 RETURN 'ok'; END $$;

-- Nome de usuário definido pela administração da escola; usado para entrar no lugar do e-mail.
CREATE FUNCTION public.definir_usuario(_user uuid,_usuario text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE u text; BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Somente administradores'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public.escola_membros WHERE user_id=_user AND escola_id=public.minha_escola()) THEN RAISE EXCEPTION 'Conta não pertence à sua escola'; END IF;
 u:=lower(trim(coalesce(_usuario,'')));
 IF u = '' THEN
  UPDATE public.profiles SET usuario=NULL WHERE id=_user;
 ELSE
  IF u !~ '^[a-z0-9._-]{3,30}$' THEN RAISE EXCEPTION 'Use de 3 a 30 caracteres: letras, números, ponto, hífen ou sublinhado'; END IF;
  IF EXISTS(SELECT 1 FROM public.profiles WHERE lower(usuario)=u AND id<>_user) THEN RAISE EXCEPTION 'Este nome de usuário já está em uso'; END IF;
  UPDATE public.profiles SET usuario=u WHERE id=_user;
 END IF;
 PERFORM public.auditar('Definiu nome de usuário',jsonb_build_object('usuario',public.nome_usuario(_user),'login',u)); END $$;

-- Resolve nome de usuário em e-mail para o login; só responde para contas com perfil em uma escola ativa.
CREATE FUNCTION public.buscar_email_por_usuario(_usuario text) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
 SELECT p.email FROM public.profiles p
  JOIN public.user_roles r ON r.user_id=p.id
  JOIN public.escolas esc ON esc.id=r.escola_id AND esc.status='ativa'
 WHERE p.usuario=lower(trim(_usuario)) LIMIT 1
$$;

-- Escola criada pelo fluxo antigo (só nome) também fica aguardando verificação.
CREATE OR REPLACE FUNCTION public.criar_escola(_nome text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE s uuid; BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Entre na sua conta'; END IF;
 PERFORM 1 FROM public.profiles WHERE id=auth.uid() FOR UPDATE;
 IF public.minha_escola() IS NOT NULL THEN RAISE EXCEPTION 'Sua conta já está vinculada a uma escola'; END IF;
 IF char_length(trim(coalesce(_nome,''))) NOT BETWEEN 3 AND 120 THEN RAISE EXCEPTION 'Informe o nome da escola (3 a 120 caracteres)'; END IF;
 INSERT INTO public.escolas(nome,status,admin_pendente) VALUES(trim(_nome),'aguardando',auth.uid()) RETURNING id INTO s;
 INSERT INTO public.escola_membros(user_id,escola_id) VALUES(auth.uid(),s);
 PERFORM public.auditar('Cadastrou escola — aguardando verificação',jsonb_build_object('escola',trim(_nome)));
 RETURN s; END $$;

-- Edição dos dados da escola pelo administrador dela.
CREATE FUNCTION public.atualizar_dados_escola(_email_institucional text,_endereco text,_cidade text,_estado text,_cep text,_telefone text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
 IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'Somente administradores'; END IF;
 IF coalesce(_email_institucional,'') !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN RAISE EXCEPTION 'Informe um e-mail institucional válido'; END IF;
 UPDATE public.escolas SET email_institucional=trim(_email_institucional),endereco=trim(coalesce(_endereco,'')),cidade=trim(coalesce(_cidade,'')),estado=upper(trim(coalesce(_estado,''))),cep=trim(coalesce(_cep,'')),telefone=trim(coalesce(_telefone,'')) WHERE id=public.minha_escola();
 PERFORM public.auditar('Atualizou dados da escola',jsonb_build_object('escola',public.minha_escola())); END $$;

REVOKE ALL ON FUNCTION public.cadastrar_escola_completa(text,text,text,text,text,text,text),public.verificar_escola(uuid,boolean),public.listar_escolas_pendentes(),public.gerar_convite(public.app_role),public.revogar_convite(uuid),public.resgatar_convite(text),public.definir_usuario(uuid,text),public.atualizar_dados_escola(text,text,text,text,text,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.cadastrar_escola_completa(text,text,text,text,text,text,text),public.verificar_escola(uuid,boolean),public.listar_escolas_pendentes(),public.gerar_convite(public.app_role),public.revogar_convite(uuid),public.resgatar_convite(text),public.definir_usuario(uuid,text),public.atualizar_dados_escola(text,text,text,text,text,text),public.criar_escola(text),public.entrar_escola(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.buscar_email_por_usuario(text) TO anon,authenticated;
GRANT EXECUTE ON FUNCTION public.normalizar_nome(text) TO authenticated;
REVOKE ALL ON FUNCTION public.normalizar_nome(text) FROM PUBLIC,anon;