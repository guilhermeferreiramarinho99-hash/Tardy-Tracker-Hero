REVOKE ALL ON FUNCTION public.criar_escola(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.cadastrar_escola_completa(text,text,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
COMMENT ON FUNCTION public.criar_escola(text) IS 'DEPRECATED: school creation is disabled for this single-school application; existing school data is retained.';
COMMENT ON FUNCTION public.cadastrar_escola_completa(text,text,text,text,text,text,text) IS 'DEPRECATED: public school registration is disabled for this single-school application.';