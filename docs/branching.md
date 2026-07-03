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

## Parallel sessions — one checkout is ONE git context

Learned the hard way (2026-07-02): branches belong to the *checkout*, not the
session. Two sessions working in the same directory share one HEAD, one index,
one working tree — when one switches branches or commits, it does so for both.
That day, session B's `checkout -b` silently moved session A onto B's branch,
and A's commit swept up B's in-flight edits.

Rules:

1. **The main checkout belongs to one git-active session at a time.** The first
   session to branch owns it; check `git branch --show-current` before your
   first git command — if you're unexpectedly on someone else's branch, stop
   and ask rather than committing.
2. **A second concurrent session uses `git worktree`** — its own physical
   checkout of its own branch, immune to the other session's git operations:
   ```bash
   git worktree add ../glaum-<branch> -b <type>/<slug>
   # …work there; when merged:
   git worktree remove ../glaum-<branch>
   ```
   (Claude sessions: the EnterWorktree tool does this for you.)
3. **Never `git add -A` / `git add .` in the shared checkout.** Stage explicit
   paths only — the tree may contain another session's (or Chante's) in-flight
   files.
4. Sessions that only *read* need no branch and no worktree.
5. **Commit work-in-progress to the feature branch; never leave the shared
   checkout dirty between turns.** (Learned 2026-07-02: review-round edits sat
   uncommitted for hours and got swept by a stash.) A dev server serves the
   working tree either way, so the review loop doesn't change — but committed
   work survives stashes, branch switches, and resets. Sign-off then triggers
   the merge, not the first commit.
6. **Never `git stash` in the shared checkout.** The tree may hold several
   parties' in-flight work, and stash sweeps it all invisibly. If someone
   else's dirty files block you, stop and surface it (or take a worktree).
7. **Release `main` the moment you're done with it.** A branch can only be
   checked out in one worktree at a time, so a worktree parked on `main`
   blocks every other session's merge. After merge + push, immediately
   `git switch --detach` (or remove the worktree). Humans wanting a local
   view of main: keep that worktree **detached** (`git fetch && git checkout
   --detach origin/main` to refresh) — never park the branch itself.

## Claude sessions

**Every session branches before its first edit.** As soon as a session knows it
will change files, it creates its own branch — `type/slug` when the scope is
clear, `session/YYYY-MM-DD-<topic>` when it isn't yet (rename or split later if
the work firms up). Unrelated tasks in one session get separate branches. Merge
with `--no-ff` after verification (tsc + click-through), delete the branch, and
**push `main`** — Chante's approval to merge covers the deploy too (changed
2026-07-02; it used to be a separate call). Guardrails on the push:

- **Approval first.** Merge + push happen when Chante has signed off on the
  change ("looks good", "merge it"). Never push work she hasn't seen.
- **A push ships all of `main`.** Check `git log --first-parent origin/main..main`
  before pushing; if it carries another session's unpushed merge, that's fine —
  nothing lands on main unverified (rule 1) — but say so in the summary.
- **Docs ride along — verify before pushing (added 2026-07-02).** Every commit
  being pushed must have its docs already folded in (the standing docs-before-
  commit sweep: `docs/database.md` incl. migrations ledger, `docs/features.md`,
  `docs/architecture.md`, the relevant feature spec, `docs/generalizability-log.md`).
  Before pushing, glance over the outgoing commits and confirm that's true —
  including other sessions' merges the push would carry. Stale docs → land the
  docs fix first (rule-5 tweak or quick branch), then push.
- **Migrations deploy with their code** (rule 6): apply the migration to prod as
  part of the same merge+push, and note the number in the merge commit. If the
  migration can't be applied right then, hold the push and say why.
- **When in doubt, don't.** Anything half-verified or prod acting strange —
  leave the push to Chante.

Rule-5 tiny tweaks (log updates, one-line doc fixes) may still go straight to
`main`.

## Day-to-day cheat sheet

```bash
git checkout -b fix/thing        # start
# …work, verify (tsc + local click-through)…
git add -A && git commit -m "Fix thing"
git checkout main
git merge --no-ff fix/thing -m "Fix thing (fix/thing)"
git branch -d fix/thing
# ship (on approval — approval to merge = approval to deploy):
git push
```
