\set ON_ERROR_STOP on
BEGIN;

-- Test-only helpers are SECURITY INVOKER: assertions must not bypass RLS.
CREATE FUNCTION pg_temp.assert_true(ok boolean, label text) RETURNS void
LANGUAGE plpgsql AS $$ BEGIN
  IF ok IS DISTINCT FROM true THEN RAISE EXCEPTION 'FAIL: %', label; END IF;
END $$;
CREATE FUNCTION pg_temp.expect_error(statement text, expected_state text, expected_message text)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE blocked boolean := false;
BEGIN
  BEGIN
    EXECUTE statement;
  EXCEPTION WHEN OTHERS THEN
    IF SQLSTATE <> expected_state OR SQLERRM NOT LIKE expected_message THEN
      RAISE EXCEPTION 'Unexpected error for %: [%] %', statement, SQLSTATE, SQLERRM;
    END IF;
    blocked := true;
  END;
  PERFORM pg_temp.assert_true(blocked, 'must reject: ' || statement);
END $$;

-- All accounts and data are synthetic and exist only inside this transaction.
INSERT INTO auth.users(id, email)
SELECT ('10000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
       'isolation-' || n || '@example.invalid' FROM generate_series(1,6) n;
INSERT INTO public.escolas(id,nome) VALUES
 ('20000000-0000-4000-8000-000000000001','Escola fictícia A'),
 ('20000000-0000-4000-8000-000000000002','Escola fictícia B');
INSERT INTO public.escola_membros(user_id,escola_id)
SELECT ('10000000-0000-4000-8000-' || lpad(n::text,12,'0'))::uuid,
       CASE WHEN n=2 THEN '20000000-0000-4000-8000-000000000002'::uuid
            ELSE '20000000-0000-4000-8000-000000000001'::uuid END
FROM generate_series(1,6) n;
INSERT INTO public.user_roles(user_id,escola_id,role)
SELECT user_id, escola_id, CASE right(user_id::text,1)
 WHEN '1' THEN 'admin' WHEN '2' THEN 'admin' WHEN '3' THEN 'equipe'
 WHEN '4' THEN 'coordenacao' ELSE 'aluno' END::public.app_role
FROM public.escola_membros WHERE user_id::text LIKE '10000000-%' AND right(user_id::text,1)<>'6';
INSERT INTO public.escola_config(escola_id,limite)
SELECT id,3 FROM public.escolas WHERE id::text LIKE '20000000-%';
DO $$ DECLARE n int; suffix text; s uuid; t uuid; BEGIN
 FOR n IN 1..2 LOOP
  suffix := lpad(n::text,12,'0');
  s := ('20000000-0000-4000-8000-'||suffix)::uuid;
  t := ('30000000-0000-4000-8000-'||suffix)::uuid;
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub','10000000-0000-4000-8000-'||suffix,'role','authenticated')::text,true);
  SET LOCAL ROLE authenticated;
  INSERT INTO public.turmas(id,escola_id,ano,nome) VALUES(t,s,'6º ano','Turma fictícia');
  INSERT INTO public.alunos(id,escola_id,turma_id,codigo,nome,user_id)
  VALUES(('40000000-0000-4000-8000-'||suffix)::uuid,s,t,'FICT-1','Aluno Fictício',
   CASE WHEN n=1 THEN '10000000-0000-4000-8000-000000000005'::uuid ELSE NULL END);
  -- Synthetic period covers only the test date; not a school calendar proposal.
  INSERT INTO public.periodos(escola_id,nome,inicio,fim)
  VALUES(s,'Período fictício',(now() AT TIME ZONE 'America/Campo_Grande')::date-5,
   (now() AT TIME ZONE 'America/Campo_Grande')::date+1);
  RESET ROLE;
 END LOOP;
 PERFORM set_config('request.jwt.claims','',true);
END $$;
INSERT INTO public.atrasos(id,escola_id,aluno_id,data,hora) VALUES
 ('50000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000001',(now() AT TIME ZONE 'America/Campo_Grande')::date-2,'07:10'),
 ('50000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000002',(now() AT TIME ZONE 'America/Campo_Grande')::date-2,'07:10');

-- Run the same positive and negative assertions in BOTH directions.
DO $$
DECLARE n int; other int; s uuid; target uuid; student uuid; foreign_student uuid;
 occurrence uuid; foreign_occurrence uuid; actor uuid; affected int; result jsonb;
BEGIN
 FOR n IN 1..2 LOOP
  other := 3-n;
  actor := ('10000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
  s := ('20000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
  target := ('20000000-0000-4000-8000-'||lpad(other::text,12,'0'))::uuid;
  student := ('40000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
  foreign_student := ('40000000-0000-4000-8000-'||lpad(other::text,12,'0'))::uuid;
  occurrence := ('50000000-0000-4000-8000-'||lpad(n::text,12,'0'))::uuid;
  foreign_occurrence := ('50000000-0000-4000-8000-'||lpad(other::text,12,'0'))::uuid;
  PERFORM set_config('request.jwt.claims',jsonb_build_object('sub',actor,'role','authenticated')::text,true);
  SET LOCAL ROLE authenticated;
  PERFORM pg_temp.assert_true(current_user='authenticated' AND auth.uid()=actor, 'real authenticated role and actor');
  PERFORM pg_temp.assert_true(public.minha_escola()=s, 'own membership');
  PERFORM pg_temp.assert_true((SELECT count(*)=1 FROM public.alunos), 'only own student in unfiltered query');
  PERFORM pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.alunos WHERE id=foreign_student), 'foreign student ID hidden');
  PERFORM pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.atrasos WHERE id=foreign_occurrence), 'foreign occurrence ID hidden');
  PERFORM pg_temp.assert_true((SELECT count(*)=1 FROM public.escola_config), 'only own configuration');
  PERFORM pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.escola_config WHERE escola_id=target), 'foreign configuration hidden');
  PERFORM pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.atrasos WHERE escola_id<>s), 'unfiltered occurrence query isolated');

  UPDATE public.alunos SET nome='Aluno Fictício Alterado '||n WHERE id=student;
  GET DIAGNOSTICS affected=ROW_COUNT;
  PERFORM pg_temp.assert_true(affected=1, 'admin changes own student');
  PERFORM pg_temp.assert_true((SELECT nome='Aluno Fictício Alterado '||n FROM public.alunos WHERE id=student), 'student change reads back');
  UPDATE public.alunos SET nome='INVASÃO' WHERE id=foreign_student;
  GET DIAGNOSTICS affected=ROW_COUNT;
  PERFORM pg_temp.assert_true(affected=0, 'foreign student update affects no rows');
  UPDATE public.escola_config SET limite=4, contar_justificados=false WHERE escola_id=s;
  GET DIAGNOSTICS affected=ROW_COUNT;
  PERFORM pg_temp.assert_true(affected=1, 'admin changes own configuration');
  PERFORM pg_temp.assert_true((SELECT limite=4 AND NOT contar_justificados FROM public.escola_config WHERE escola_id=s), 'configuration reads back');
  UPDATE public.escola_config SET limite=50 WHERE escola_id=target;
  GET DIAGNOSTICS affected=ROW_COUNT;
  PERFORM pg_temp.assert_true(affected=0, 'foreign configuration update affects no rows');

  result := public.registrar_atraso(student,false,'Registro fictício automatizado');
  PERFORM pg_temp.assert_true(result->>'quantidade'='2', 'register own occurrence and count');
  PERFORM pg_temp.assert_true(EXISTS(SELECT 1 FROM public.atrasos WHERE aluno_id=student AND registrado_por=actor AND observacao='Registro fictício automatizado'), 'occurrence reads back with author');
  PERFORM public.corrigir_atraso(occurrence,true,'Correção fictícia');
  PERFORM pg_temp.assert_true((SELECT justificado FROM public.atrasos WHERE id=occurrence), 'own correction reads back');
  PERFORM public.cancelar_atraso(occurrence,'Cancelamento fictício');
  PERFORM pg_temp.assert_true((SELECT cancelado FROM public.atrasos WHERE id=occurrence), 'own cancellation reads back');
  PERFORM pg_temp.expect_error(format('SELECT public.registrar_atraso(%L,false,NULL)',foreign_student),'P0001','Aluno não encontrado ou inativo');
  PERFORM pg_temp.expect_error(format('SELECT public.registrar_atraso_offline(%L,false,NULL,current_date-1,''07:10'')',foreign_student),'P0001','Aluno não encontrado ou inativo');
  PERFORM pg_temp.expect_error(format('SELECT public.corrigir_atraso(%L,true,''Tentativa fictícia'')',foreign_occurrence),'P0001','Registro não encontrado');
  PERFORM pg_temp.expect_error(format('SELECT public.cancelar_atraso(%L,''Tentativa fictícia'')',foreign_occurrence),'P0001','Registro não encontrado');
  PERFORM pg_temp.expect_error(format('UPDATE public.alunos SET escola_id=%L WHERE id=%L',target,student),'P0001','A escola do registro não pode ser alterada');
  PERFORM pg_temp.expect_error(format('UPDATE public.alunos SET turma_id=%L WHERE id=%L',('30000000-0000-4000-8000-'||lpad(other::text,12,'0'))::uuid,student),'P0001','Turma não pertence à escola');
  PERFORM pg_temp.expect_error(format('INSERT INTO public.alunos(escola_id,turma_id,codigo,nome) VALUES(%L,%L,''INVASÃO'',''Aluno invasor fictício'')',target,('30000000-0000-4000-8000-'||lpad(other::text,12,'0'))::uuid),'P0001','Sem permissão para acessar dados de outra escola');
  PERFORM pg_temp.expect_error(format('UPDATE public.escola_config SET escola_id=%L WHERE escola_id=%L',target,s),'42501','new row violates row-level security policy%');
  PERFORM pg_temp.expect_error(format('UPDATE public.atrasos SET justificado=false WHERE id=%L',occurrence),'42501','permission denied for table atrasos');
  PERFORM pg_temp.assert_true(EXISTS(SELECT 1 FROM public.auditoria WHERE usuario=actor AND operacao='Corrigiu atraso' AND detalhes->>'atraso'=occurrence::text), 'correction audited');
  PERFORM pg_temp.assert_true(EXISTS(SELECT 1 FROM public.auditoria WHERE usuario=actor AND operacao='Cancelou atraso' AND detalhes->>'atraso'=occurrence::text), 'cancellation audited');
  PERFORM pg_temp.assert_true(EXISTS(SELECT 1 FROM public.auditoria WHERE usuario=actor AND operacao='UPDATE em escola_config'), 'configuration audited');
  PERFORM pg_temp.assert_true(EXISTS(SELECT 1 FROM public.auditoria WHERE usuario=actor AND operacao='UPDATE em alunos'), 'student update audited');
  RESET ROLE;
  PERFORM set_config('request.jwt.claims','',true);
  -- Privileged verification of the foreign record: failure must not mutate it.
  PERFORM pg_temp.assert_true((SELECT nome=CASE WHEN n=1 THEN 'Aluno Fictício' ELSE 'Aluno Fictício Alterado 1' END FROM public.alunos WHERE id=foreign_student), 'other school student remains intact');
  PERFORM pg_temp.assert_true((SELECT limite=CASE WHEN n=1 THEN 3 ELSE 4 END FROM public.escola_config WHERE escola_id=target), 'other school configuration remains intact');
  PERFORM pg_temp.assert_true((SELECT justificado=(n=2) AND cancelado=(n=2) FROM public.atrasos WHERE id=foreign_occurrence), 'other school occurrence remains intact');
 END LOOP;
END $$;

-- Authorization is role-specific, not just school-specific.
DO $$
DECLARE affected int;
BEGIN
 PERFORM set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000003","role":"authenticated"}',true);
 SET LOCAL ROLE authenticated;
 PERFORM pg_temp.assert_true((SELECT count(*)=1 FROM public.alunos), 'staff reads own students');
 PERFORM pg_temp.assert_true((SELECT count(*)=1 FROM public.escola_config), 'staff reads own configuration');
 PERFORM public.registrar_atraso_offline('40000000-0000-4000-8000-000000000001',false,'Envio fictício',(now() AT TIME ZONE 'America/Campo_Grande')::date-1,'07:10');
 PERFORM pg_temp.assert_true(EXISTS(SELECT 1 FROM public.atrasos WHERE observacao='Envio fictício' AND registrado_por=auth.uid()), 'staff occurrence reads back');
 PERFORM pg_temp.expect_error('SELECT public.corrigir_atraso(''50000000-0000-4000-8000-000000000001'',false,''Tentativa fictícia'')','P0001','Sem permissão para corrigir registros');
 UPDATE public.alunos SET nome='INVASÃO'; GET DIAGNOSTICS affected=ROW_COUNT;
 PERFORM pg_temp.assert_true(affected=0, 'staff cannot edit student');
 UPDATE public.escola_config SET limite=50; GET DIAGNOSTICS affected=ROW_COUNT;
 PERFORM pg_temp.assert_true(affected=0, 'staff cannot edit configuration');
 RESET ROLE;
 PERFORM set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000004","role":"authenticated"}',true);
 SET LOCAL ROLE authenticated;
 PERFORM public.corrigir_atraso((SELECT id FROM public.atrasos WHERE observacao='Envio fictício'),true,'Correção pela coordenação fictícia');
 PERFORM pg_temp.assert_true((SELECT justificado FROM public.atrasos WHERE observacao='Envio fictício'), 'coordination corrects own school occurrence');
 PERFORM pg_temp.expect_error('SELECT public.corrigir_atraso(''50000000-0000-4000-8000-000000000002'',false,''Tentativa fictícia'')','P0001','Registro não encontrado');
 UPDATE public.escola_config SET limite=50; GET DIAGNOSTICS affected=ROW_COUNT;
 PERFORM pg_temp.assert_true(affected=0, 'coordination cannot change admin settings');
 RESET ROLE;
 PERFORM set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000005","role":"authenticated"}',true);
 SET LOCAL ROLE authenticated;
 PERFORM pg_temp.assert_true((SELECT count(*)=1 FROM public.alunos WHERE user_id=auth.uid()), 'student sees linked self');
 PERFORM pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.alunos WHERE user_id IS DISTINCT FROM auth.uid()), 'student sees no other students');
 PERFORM pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.atrasos WHERE aluno_id<>'40000000-0000-4000-8000-000000000001'), 'student sees own occurrences only');
 PERFORM pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.escola_config), 'student cannot read internal settings');
 PERFORM pg_temp.expect_error('SELECT public.registrar_atraso(''40000000-0000-4000-8000-000000000001'',false,NULL)','P0001','Sem permissão para registrar atrasos');
 UPDATE public.alunos SET nome='INVASÃO'; GET DIAGNOSTICS affected=ROW_COUNT;
 PERFORM pg_temp.assert_true(affected=0, 'student cannot edit students');
 RESET ROLE;
 PERFORM set_config('request.jwt.claims','{"sub":"10000000-0000-4000-8000-000000000006","role":"authenticated"}',true);
 SET LOCAL ROLE authenticated;
 PERFORM pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.alunos), 'pending member cannot read students');
 PERFORM pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.atrasos), 'pending member cannot read occurrences');
 PERFORM pg_temp.assert_true(NOT EXISTS(SELECT 1 FROM public.escola_config), 'pending member cannot read settings');
 PERFORM pg_temp.expect_error('SELECT public.registrar_atraso(''40000000-0000-4000-8000-000000000001'',false,NULL)','P0001','Sem permissão para registrar atrasos');
 RESET ROLE;
 PERFORM set_config('request.jwt.claims','',true);
 SET LOCAL ROLE anon;
 PERFORM pg_temp.expect_error('SELECT * FROM public.alunos','42501','permission denied for table alunos');
 PERFORM pg_temp.expect_error('SELECT * FROM public.atrasos','42501','permission denied for table atrasos');
 PERFORM pg_temp.expect_error('SELECT * FROM public.escola_config','42501','permission denied for table escola_config');
 RESET ROLE;
END $$;
ROLLBACK;

DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM public.escolas WHERE id::text LIKE '20000000-%')
 OR EXISTS(SELECT 1 FROM auth.users WHERE id::text LIKE '10000000-%') THEN
  RAISE EXCEPTION 'FAIL: synthetic data was not rolled back';
 END IF;
END $$;