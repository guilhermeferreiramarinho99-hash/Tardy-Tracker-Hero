\set ON_ERROR_STOP on
BEGIN;
DO $$
DECLARE actor text; signature text;
BEGIN
  FOREACH actor IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    FOREACH signature IN ARRAY ARRAY['public.criar_escola(text)', 'public.cadastrar_escola_completa(text,text,text,text,text,text,text)'] LOOP
      IF has_function_privilege(actor, signature, 'EXECUTE') THEN
        RAISE EXCEPTION 'School registration must be blocked for %: %', actor, signature;
      END IF;
    END LOOP;
  END LOOP;
  IF NOT has_function_privilege('authenticated', 'public.resgatar_convite(text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Existing invitation access must remain available';
  END IF;
END $$;
ROLLBACK;
\echo 'PASS: single-school registration blocked; invitations preserved'