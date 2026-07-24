# Contributing and merging pull requests

This project already has a GitHub repository. Do **not** use GitHub's **Create a
new repository** page to merge a pull request; doing so creates a separate,
unrelated repository with no shared history.

## Merge a pull request in GitHub

1. Open the existing String Ledger repository on GitHub.
2. Select **Pull requests**, then open the pull request.
3. Wait for the `checks` workflow to finish successfully.
4. If GitHub says the branch can be merged, select **Squash and merge** and
   confirm the title and description.
5. Pull the updated default branch locally after the merge:

   ```bash
   git switch main
   git pull --ff-only origin main
   ```

Squash merging is preferred for feature pull requests because it keeps the
default branch readable while the pull request retains the detailed commit and
review history.

## Update a pull request that has conflicts

The safest approach is to update the pull-request branch locally. Start with a
clean working tree and create a temporary backup reference before rewriting the
branch:

```bash
git status --short
git switch <pull-request-branch>
git branch backup/<pull-request-branch>-before-rebase
git fetch origin
git rebase origin/main
```

For every conflicted file:

1. Open the file and resolve each section between `<<<<<<<`, `=======`, and
   `>>>>>>>`.
2. Preserve both sides when they represent independent changes. Do not blindly
   choose “ours” or “theirs” for application code.
3. Mark the resolved file and continue:

   ```bash
   git add <resolved-file>
   git rebase --continue
   ```

If the resolution is going in the wrong direction, `git rebase --abort`
returns the branch to its pre-rebase state.

### Resolving dependency-file conflicts

Treat `package.json` as the source of truth. Resolve its intended scripts and
dependency versions first. For a conflicted `package-lock.json`, do not
hand-edit large generated sections. After resolving `package.json`, regenerate
the lockfile using the supported Node.js version:

```bash
git checkout --theirs package-lock.json
npm install --package-lock-only
git add package.json package-lock.json
git rebase --continue
```

`--theirs` during a rebase refers to the commit being replayed, so inspect the
result rather than relying on the label. The subsequent npm command reconciles
the lockfile with the resolved manifest.

## Verify and publish the updated branch

Run the same checks as CI before updating the pull request:

```bash
npm ci
npm run format:check
npm run typecheck
npm run lint
npm test
npm run build
git diff --check origin/main...HEAD
```

Because a rebase rewrites commit IDs, publish it with the guarded force option:

```bash
git push --force-with-lease origin <pull-request-branch>
```

Never use an unguarded `git push --force`. `--force-with-lease` refuses to
overwrite remote work that appeared after the last fetch. Return to the
existing pull request; GitHub updates it automatically and reruns CI.
