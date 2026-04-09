---
name: commit
description: Create a git commit following Gåri project conventions — selective staging, separate commits for unrelated changes.
user_invocable: true
---

# Commit skill

Create a well-structured git commit for the Gåri project.

## Steps

1. Run `git status` and `git diff --staged` and `git diff` in parallel to understand what changed.
2. Run `git log --oneline -5` to match recent commit message style.
3. Analyze changes:
   - Group related changes. If there are unrelated changes, ask the user whether to split into multiple commits.
   - Never stage `.env`, credentials, or secret files.
   - Never stage unrelated files without asking.
4. Stage files selectively with `git add <specific files>` (never `git add -A` or `git add .`).
5. Write a commit message:
   - Format: `type(scope): description` where type is feat/fix/docs/refactor/test/chore
   - Keep the first line under 72 characters
   - Add a body if the "why" isn't obvious from the diff
   - End with `Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>`
6. Create the commit using a HEREDOC for the message.
7. Run `git status` to verify.

## Rules
- NEVER amend existing commits unless explicitly asked
- NEVER push unless explicitly asked
- NEVER use `--no-verify`
- If pre-commit hook fails, fix the issue and create a NEW commit
- Always use HEREDOC for commit messages to preserve formatting
