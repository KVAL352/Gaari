---
name: new-skill
description: Create a new Claude Code skill with correct frontmatter and conventions
argument-hint: [skill-name] [description]
disable-model-invocation: true
---

# Create a new skill

Create a skill for: **$ARGUMENTS**

## Skill file structure

Every skill lives in `.claude/skills/<skill-name>/SKILL.md`.

## YAML frontmatter reference

```yaml
---
name: <skill-name>              # Required. Kebab-case, matches directory name
description: <one-liner>        # Required. Shown in skill picker (<80 chars)
argument-hint: [arg1] [arg2]    # Optional. Placeholder shown after /skill-name
disable-model-invocation: true  # Set true for action skills (user-invoked only)
context: fork                   # Set to fork ONLY for read-only/reporting skills
agent: Explore                  # Set to Explore ONLY for codebase-search skills
allowed-tools: Tool(pattern)    # Optional. Restrict which tools the skill can use
---
```

## Frontmatter decision guide

| Scenario | `disable-model-invocation` | `context` | `agent` |
|----------|---------------------------|-----------|---------|
| User runs `/skill args` to do work | `true` | omit | omit |
| Read-only report (no edits) | omit | `fork` | `Explore` |
| Restricted tool access | `true` | omit | omit |

- **Most skills** need only `name`, `description`, `argument-hint`, and `disable-model-invocation: true`
- `context: fork` + `agent: Explore` is only for skills that search/report but never edit files
- `allowed-tools` restricts execution — use format `Bash(command-pattern *)` or `Tool(pattern)`

## Body template

```markdown
# <Imperative title>

<One sentence with **$ARGUMENTS** reference>

## Steps

1. **Read relevant file** — understand current state before editing
2. **Make changes** — specific instructions with code examples
3. **Verify** — run tests or checks if applicable

## Example

Show a concrete before/after or usage example.

## Important

- Key constraint 1
- Key constraint 2
```

## Writing guidelines — minimize token usage

1. **Be specific, not exploratory** — tell Claude exactly which files to read/edit, don't say "explore the codebase"
2. **Include code templates** — inline the boilerplate so Claude doesn't need to read other files for patterns
3. **Use file paths** — always reference exact paths (`scripts/lib/venues.ts`, not "the venues file")
4. **List valid values** — enumerate allowed options inline (categories, bydeler, etc.) instead of saying "check the types file"
5. **One read, one edit** — structure steps as: read target file → make the edit. Avoid multi-file exploration
6. **Skip obvious context** — don't repeat what's in CLAUDE.md. Skills run with CLAUDE.md already loaded

## Existing skills for reference

| Skill | Type | Purpose |
|-------|------|---------|
| `/new-scraper` | Action | Scaffold scraper + register in scrape.ts |
| `/run-scraper` | Action (restricted) | Run single scraper via allowed-tools |
| `/add-venue` | Action | Add venue to venues.ts + categories.ts |
| `/new-collection` | Action | Add collection to collections.ts |
| `/new-migration` | Action | Create timestamped SQL migration |
| `/verify` | Action (restricted) | Run lint→check→test→build |
| `/review-pr` | Action | Review PR against conventions |
| `/scraper-status` | Report (fork) | List active/disabled/orphaned scrapers |
