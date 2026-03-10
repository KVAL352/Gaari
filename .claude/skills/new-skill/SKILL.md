---
name: new-skill
description: Create a new Claude Code skill with correct frontmatter and conventions
argument-hint: "[skill-name] [description]"
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
description: <one-liner>        # Required. Max ~120 chars. Include trigger phrases for natural-language skills.
argument-hint: "[arg1] [arg2]"  # Optional. Placeholder shown after /skill-name. Must be quoted string.
user-invocable: true            # Set for skills triggered by natural language ("god morgen", "sjekk epost")
disable-model-invocation: true  # Set for action skills invoked as slash commands (/skill args)
context: fork                   # Set to fork ONLY for read-only/reporting skills
agent: Explore                  # Set to Explore ONLY for codebase-search skills
allowed-tools: Tool(pattern)    # Optional. Restrict which tools the skill can use
---
```

## Frontmatter decision guide

| Scenario | `user-invocable` | `disable-model-invocation` | `context` | `agent` |
|----------|-----------------|---------------------------|-----------|---------|
| Triggered by natural language phrases | `true` | omit | omit | omit |
| User runs `/skill args` to do work | omit | `true` | omit | omit |
| Read-only report (no edits) | omit | omit | `fork` | `Explore` |
| Restricted tool access | omit | `true` | omit | omit |

- **Natural-language skills** (morgen, email, tasks, wrap-up, etc.): set `user-invocable: true` + include trigger phrases in description
- **Slash-command skills** (new-scraper, verify, etc.): set `disable-model-invocation: true`
- `context: fork` + `agent: Explore` is only for skills that search/report but never edit files
- `allowed-tools` restricts execution — use format `Bash(command-pattern *)` or `Tool(pattern)`
- `argument-hint` values must be **quoted strings** in YAML

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
| `morgen` | Natural language | Morning briefing — email + tasks + health + git |
| `email` | Natural language | Protonmail inbox triage |
| `tasks` | Natural language | Project calendar — list, add, complete tasks |
| `wrap-up` | Natural language | End-of-session checklist |
| `health` | Natural language | Website health audit |
| `seo` | Natural language | SEO audit for pages/collections |
| `copywriter` | Natural language | Write/review bilingual Bergen copy |
| `designer` | Natural language | UI review with Funkis design system |
| `plakatdesign` | Natural language | Generate print-ready posters as SVG/HTML |
| `/new-scraper` | Slash command | Scaffold scraper + register in scrape.ts |
| `/run-scraper` | Slash command (restricted) | Run single scraper via allowed-tools |
| `/add-venue` | Slash command | Add venue to venues.ts + categories.ts |
| `/new-collection` | Slash command | Add collection to collections.ts |
| `/new-migration` | Slash command | Create timestamped SQL migration |
| `/verify` | Slash command (restricted) | Run lint→check→test→build |
| `/review-pr` | Slash command | Review PR against conventions |
| `/scraper-status` | Report (fork) | List active/disabled/orphaned scrapers |
