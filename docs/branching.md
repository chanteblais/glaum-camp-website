# Branching strategy

Deliberately chill. The goal is that `main` always deploys cleanly and every
non-trivial change is one visible, revertable unit — not ceremony.

## The rules

1. **`main` is the deployable truth.** Pushing `main` to GitHub deploys production
   (Vercel). Never push `main` with something half-done in it.
2. **Branch for anything non-trivial.** Short-lived, named `type/slug`:
   - `feat/…` new feature · `fix/…` bug fix · `ux/…` UX-advisor rounds ·
     `docs/…` documentation · `chore/…` everything else
   - Examples: `fix/dangling-profile-bindings`, `feat/shifts-redesign`, `ux/round-4`
3. **Verify before merging:** `npx tsc --noEmit` passes and you've clicked through
   the affected pages on a local dev server.
4. **Merge with `--no-ff`, then delete the branch.** The merge commit keeps the
   change visible as one unit in history (`git log --first-parent main` reads as a
   changelog); deleting keeps the branch list honest.
5. **Tiny tweaks may go straight to `main`.** Copy edits, doc updates, one-line
   fixes — use judgment. If it could break a page, branch.
6. **Migrations ride the branch that needs them.** Apply to prod at merge+deploy
   time, not before; note the migration number in the merge commit message.
7. **Want eyes on something before it ships?** Push the *branch* — Vercel builds a
   preview URL per branch — then merge when happy.

## Claude sessions

Claude follows the same rules: work lands on a `type/slug` branch (or directly on
`main` only for rule-5 tweaks), merges with `--no-ff` after verification, and
**never pushes** — pushing (= deploying) is always Chante's call.

## Day-to-day cheat sheet

```bash
git checkout -b fix/thing        # start
# …work, verify (tsc + local click-through)…
git add -A && git commit -m "Fix thing"
git checkout main
git merge --no-ff fix/thing -m "Fix thing (fix/thing)"
git branch -d fix/thing
# ship when ready:
git push
```
