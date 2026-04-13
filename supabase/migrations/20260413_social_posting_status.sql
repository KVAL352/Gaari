-- Social posting checklist state (replaces localStorage in /r/week/)
CREATE TABLE IF NOT EXISTS social_posting_status (
    week_start TEXT NOT NULL,
    task_key TEXT NOT NULL,
    done BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (week_start, task_key)
);

ALTER TABLE social_posting_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY social_posting_status_all ON social_posting_status FOR ALL TO anon USING (true) WITH CHECK (true);
