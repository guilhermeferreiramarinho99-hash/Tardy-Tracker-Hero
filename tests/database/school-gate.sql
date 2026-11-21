\set ON_ERROR_STOP on
BEGIN;
DO $$
BEGIN
 IF has_table_privilege('anon','public.site_gate_config','SELECT') OR has_table_privilege('authenticated','public.site_gate_config','SELECT') THEN
  RAISE EXCEPTION 'Gate credentials must not be readable by visitors or accounts';
 END IF;
 IF has_function_privilege('anon','public.trocar_senha_escola(text)','EXECUTE') THEN
  RAISE EXCEPTION 'Visitors must not change the school password';
 END IF;
END $$;
INSERT INTO auth.users(id,email) VALUES ('90000000-0000-4000-8000-000000000001','gate-admin@example.invalid'),('90000000-0000-4000-8000-000000000002','gate-staff@example.invalid');
INSERT INTO public.escolas(id,nome) VALUES ('90000000-0000-4000-8000-000000000003','Escola fictícia senha');
INSERT INTO public.escola_membros(user_id,escola_id) VALUES ('90000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000003'),('90000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000003');
INSERT INTO public.user_roles(user_id,escola_id,role) VALUES ('90000000-0000-4000-8000-000000000001','90000000-0000-4000-8000-000000000003','admin'),('90000000-0000-4000-8000-000000000002','90000000-0000-4000-8000-000000000003','equipe');
DO $$ DECLARE previous uuid; rotated uuid; blocked boolean := false;
BEGIN
 PERFORM set_config('request.jwt.claims','{"sub":"90000000-0000-4000-8000-000000000002"}',true);
 SET LOCAL ROLE authenticated;
 BEGIN
  PERFORM public.trocar_senha_escola(repeat('a',64));
 EXCEPTION WHEN OTHERS THEN
  IF SQLERRM NOT LIKE 'Somente a administração%' THEN RAISE; END IF;
  blocked := true;
 END;
 IF NOT blocked THEN RAISE EXCEPTION 'Staff must not change gate password'; END IF;
 RESET ROLE;
 PERFORM set_config('request.jwt.claims','{"sub":"90000000-0000-4000-8000-000000000001"}',true);
 SET LOCAL ROLE authenticated;
 previous := public.trocar_senha_escola(repeat('a',64));
 rotated := public.trocar_senha_escola(repeat('b',64));
 RESET ROLE;
 IF previous = rotated THEN RAISE EXCEPTION 'Rotation must invalidate old unlocked cookies'; END IF;
 IF (SELECT count(*) FROM public.auditoria WHERE operacao='trocar_senha_escola' AND usuario='90000000-0000-4000-8000-000000000001') <> 2 THEN RAISE EXCEPTION 'Password changes must be audited'; END IF;
 IF EXISTS(SELECT 1 FROM public.auditoria WHERE operacao='trocar_senha_escola' AND detalhes <> '{}'::jsonb) THEN RAISE EXCEPTION 'Audit must not contain passwords'; END IF;
END $$;
ROLLBACK;
\echo 'PASS: gate rotation admin-only, private credentials and audit'