CREATE TABLE public.site_gate_config (id integer PRIMARY KEY CHECK (id = 1), password_digest text NOT NULL CHECK (password_digest ~ '^[a-f0-9]{64}$'), version uuid NOT NULL DEFAULT gen_random_uuid());
GRANT ALL ON public.site_gate_config TO service_role;
REVOKE ALL ON public.site_gate_config FROM anon, authenticated;
ALTER TABLE public.site_gate_config ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.trocar_senha_escola(_digest text) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v uuid;
BEGIN
 IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Somente a administração pode trocar a senha da escola'; END IF;
 IF _digest IS NULL OR _digest !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Senha inválida'; END IF;
 INSERT INTO public.site_gate_config(id,password_digest) VALUES (1,_digest) ON CONFLICT(id) DO UPDATE SET password_digest=EXCLUDED.password_digest, version=gen_random_uuid() RETURNING version INTO v;
 PERFORM public.auditar('trocar_senha_escola', '{}'::jsonb);
 RETURN v;
END $$;
REVOKE ALL ON FUNCTION public.trocar_senha_escola(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trocar_senha_escola(text) TO authenticated;