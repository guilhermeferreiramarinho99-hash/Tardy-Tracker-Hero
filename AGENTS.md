<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- All writes to official records (atrasos, alertas, roles) go through SECURITY DEFINER RPCs that check roles and write auditoria; tables expose SELECT only via RLS — keeps permission logic in the database, not the UI.
- Client data hooks live in src/lib/api.ts (react-query over the browser Supabase client); protected pages live under src/routes/_authenticated/.
- Student deletion controls share ExcluirAluno across the student list and administration, calling the existing audited RPC; this keeps confirmation and history protection consistent.
- Account creation must return success only with a valid session, using password sign-in as a fallback when signup returns none; this prevents navigation into protected pages while signed out.
- The root entry reuses the password sign-in screen and school identity from a shared module; school-creation RPC execution is revoked while existing memberships and tenant protections remain intact to preserve historical data.
- Each account has one immutable school membership; school-owned rows use restrictive tenant RLS plus validation triggers and scoped SECURITY DEFINER RPC lookups. Why: neither guessed record IDs nor school administrator roles may cross tenant boundaries.
- School onboarding is rendered by AppShell for accounts without membership; joining grants no role until school administration approves. Why: invitation codes identify schools but never grant access to student records.
- Offline delay records are held only in IndexedDB (src/lib/fila.ts) and reach the official records through the registrar_atraso_offline RPC; the generated service worker registers only from src/lib/pwa.ts, never in dev or preview. Why: the browser's own storage is a temporary holding area, never the official record.
- Database isolation regression tests replay the actual migrations in a disposable local PostgreSQL cluster and switch to the authenticated SQL role with synthetic JWT claims; never point the runner at a hosted database. Why: real RLS, triggers, RPCs and audit are exercised without touching real school data.
- The school entrance gate is additional navigation privacy, never account authorization: verify passwords server-side with HMAC and timing-safe comparison, persist an encrypted versioned cookie, and rotate through an admin-checked audited RPC; online navigation rechecks the version while existing authenticated offline workflows keep their own protections.
