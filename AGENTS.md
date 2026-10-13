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
