---
name: new-migration
description: Create a new Supabase migration file with the correct timestamp naming convention
argument-hint: [description]
disable-model-invocation: true
---

# Create a new Supabase migration

Create a migration file for: **$ARGUMENTS**

## Steps

1. Generate a timestamp in the format `YYYYMMDDHHMMSS` using the current UTC time

2. Create the file at:
   ```
   supabase/migrations/<timestamp>_<description>.sql
   ```
   Where `<description>` is a snake_case version of the migration purpose.

3. Add a descriptive comment header:
   ```sql
   -- Migration: <description>
   -- Created: <ISO date>
   ```

4. Write the SQL for the requested change.

## Conventions

- Use `IF NOT EXISTS` / `IF EXISTS` for safety (idempotent migrations)
- Always add `COMMENT ON` for new tables/columns
- For new tables: include RLS policies if the table needs anon/authenticated access
- For indexes: use `idx_<table>_<column>` naming
- Grant permissions explicitly (`GRANT SELECT ON ... TO anon`)

## Existing migrations

Check `supabase/migrations/` for existing files to understand the schema and avoid conflicts.

Key tables: `events`, `opt_out_requests`, `edit_suggestions`, `promoted_placements`, `placement_log`, `organizer_inquiries`, `social_posts`, `project_calendar`
