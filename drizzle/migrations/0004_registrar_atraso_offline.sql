-- Registro de atraso feito sem internet e enviado depois:Preserva a data e o horário em que o atraso realmente aconteceu,
-- em vez de usar a hora em que o aparelho voltou a ficar on-line.
-- Só a equipe autorizada pode enviar, e a data é validada no servidor.
CREATE OR REPLACE FUNCTION public.registrar_atraso_offline(
  _aluno uuid,
  _justificado boolean,
  _observacao text,
  _data date,
  _hora time
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $fn$
declare fz text; agora timestamp; hoje date; h time; r jsonb; nome_al text;
begin
  if not public.is_staff(auth.uid()) then raise exception 'Sem permissão para registrar atrasos'; end if;
  select nome into nome_al from public.alunos where id = _aluno and ativo;
  if nome_al is null then raise exception 'Aluno não encontrado ou inativo'; end if;
  if _data is null or _hora is null then raise exception 'Informe a data e o horário do atraso'; end if;

  select fuso into fz from public.config where id = 1;
  agora := now() at time zone fz;
  hoje := agora::date;

  if _data > hoje then raise exception 'A data do atraso não pode estar no futuro'; end if;
  if _data < hoje - 15 then raise exception 'A data do atraso é antiga demais (mais de 15 dias)'; end if;

  h := _hora;
  if _data = hoje and h > date_trunc('minute', agora)::time then h := date_trunc('minute', agora)::time; end if;

  if exists (select 1 from public.atrasos where aluno_id = _aluno and data = _data and not cancelado) then
    raise exception 'Já existe um atraso registrado nesta data para este aluno';
  end if;

  insert into public.atrasos (aluno_id, data, hora, justificado, observacao, registrado_por, registrado_por_nome)
  values (_aluno, _data, h, _justificado,
          nullif(left(trim(coalesce(_observacao,'')),200),''), auth.uid(), public.nome_usuario(auth.uid()));

  perform public.auditar('Registrou atraso enviado sem internet',
    jsonb_build_object('aluno', nome_al, 'justificado', _justificado, 'data', _data, 'hora', h));

  r := public.recalcular_alerta(_aluno, _data);
  return r || jsonb_build_object('aluno', nome_al);
end
$fn$;

REVOKE ALL ON FUNCTION public.registrar_atraso_offline(uuid, boolean, text, date, time) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.registrar_atraso_offline(uuid, boolean, text, date, time) TO authenticated;
GRANT ALL ON FUNCTION public.registrar_atraso_offline(uuid, boolean, text, date, time) TO service_role;