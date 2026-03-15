# Artha — Claude Code Guidelines

## Git Workflow

When working on any Jira issue:

1. **Create a new branch** from `main` named `feature/<ISSUE-KEY>-<short-description>` (e.g. `feature/AR-15-scaffold-vite-react-ts`)
2. **Do the work** on that branch
3. **Commit** with a message referencing the issue key (e.g. `AR-15: Scaffold Vite React-TS project`)
4. **Push** the branch immediately after committing (`git push -u origin <branch>`)
5. **Create a PR** on GitHub when the issue is complete

Never commit directly to `main`. Always push so changes are visible on GitHub.
