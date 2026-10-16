ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'superadmin';
ALTER TABLE public.escolas
  ADD COLUMN IF NOT EXISTS email_institucional text,
  ADD COLUMN IF NOT EXISTS endereco text,
  ADD COLUMN IF NOT EXISTS cidade text,
  ADD COLUMN IF NOT EXISTS estado text,
  ADD COLUMN IF NOT EXISTS cep text,
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS admin_pendente uuid,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'aguardando';
UPDATE public.escolas SET status='ativa' WHERE status='aguardando';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS usuario text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_usuario_unico ON public.profiles(lower(usuario)) WHERE usuario IS NOT NULL AND usuario <> '';