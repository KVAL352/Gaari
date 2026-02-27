---
name: tasks
description: View, add, update, or complete tasks in the project calendar (Supabase project_calendar table)
argument-hint: [action] [details]
disable-model-invocation: false
---

# Project task management

Manage the project calendar: **$ARGUMENTS**

The project calendar lives in the `project_calendar` Supabase table. It tracks milestones, deadlines, tasks, recurring items, and meetings.

## When to use this skill

- User says "what do I need to do" / "hva må jeg gjøre" → list pending tasks
- User says "add task" / "legg til" → insert a new task
- User says "done with X" / "ferdig med X" → mark task as done
- User says "update tasks" / "oppdater oppgaver" → review and update statuses
- After completing a feature/task → proactively ask if related calendar items should be updated

## Reading tasks

Query the table via Supabase CLI or the admin page:

```bash
# List all pending/in_progress tasks sorted by due date
npx supabase db execute "SELECT id, title, due_date, status, category FROM project_calendar WHERE status IN ('pending', 'in_progress') ORDER BY due_date" --project-ref <ref>
```

Or simply read the admin page data by describing what `/admin/calendar` shows.

**Preferred method**: Use the Supabase JS client directly:

```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
sb.from('project_calendar').select('*').in('status', ['pending','in_progress']).order('due_date').then(({data}) => console.log(JSON.stringify(data, null, 2)));
"
```

## Adding tasks

```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
sb.from('project_calendar').insert({
  title: '<TITLE>',
  description: '<DESCRIPTION or null>',
  due_date: '<YYYY-MM-DD>',
  status: 'pending',
  category: '<task|milestone|deadline|recurring|meeting>'
}).then(({error}) => console.log(error ? 'ERROR: ' + error.message : 'Added'));
"
```

## Updating task status

Valid statuses: `pending`, `in_progress`, `done`, `skipped`

```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
sb.from('project_calendar').update({ status: '<NEW_STATUS>', updated_at: new Date().toISOString() }).eq('id', '<UUID>').then(({error}) => console.log(error ? 'ERROR: ' + error.message : 'Updated'));
"
```

## After completing work

When a session ends or a significant task is finished, check if any calendar items relate to the work done. If so, offer to:
1. Mark related items as `done`
2. Add new follow-up tasks discovered during the work
3. Update due dates if timelines shifted

## Table schema

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | Auto-generated |
| title | TEXT | Required |
| description | TEXT | Optional |
| due_date | DATE | Required, YYYY-MM-DD |
| status | TEXT | pending / in_progress / done / skipped |
| category | TEXT | task / milestone / deadline / recurring / meeting |
| created_at | TIMESTAMPTZ | Auto |
| updated_at | TIMESTAMPTZ | Auto |

## Display format

When showing tasks to the user, use this format:

```
## Project Tasks

### Overdue
- [!] Title (was due YYYY-MM-DD) — category

### This week
- [ ] Title (due YYYY-MM-DD) — category
- [~] Title (in progress, due YYYY-MM-DD) — category

### Later
- [ ] Title (due YYYY-MM-DD) — category

### Recently completed
- [x] Title (done YYYY-MM-DD) — category
```
