-- Event reminder signups — send email the evening before the event
CREATE TABLE IF NOT EXISTS event_reminders (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email TEXT NOT NULL,
    event_slug TEXT NOT NULL,
    event_title TEXT NOT NULL,
    event_date TEXT NOT NULL,
    venue_name TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    UNIQUE (email, event_slug)
);

CREATE INDEX IF NOT EXISTS idx_event_reminders_date ON event_reminders (event_date, sent_at);

ALTER TABLE event_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY event_reminders_insert ON event_reminders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY event_reminders_select ON event_reminders FOR SELECT TO service_role USING (true);
CREATE POLICY event_reminders_update ON event_reminders FOR UPDATE TO service_role USING (true);
