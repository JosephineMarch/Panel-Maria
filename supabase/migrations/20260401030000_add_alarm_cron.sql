-- Migration: Add alarm cron system for server-side push notifications
-- Date: 2026-04-01
-- Purpose: Enable pg_cron to check pending alarms every minute and call check-alarms edge function

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_cron SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net SCHEMA extensions;

-- 2. Create alarm_notifications table
CREATE TABLE IF NOT EXISTS alarm_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL UNIQUE REFERENCES items(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    deadline TIMESTAMPTZ NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    priority TEXT DEFAULT 'normal',
    status TEXT NOT NULL DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create index for efficient pending alarm queries
CREATE INDEX idx_alarm_notifications_status_deadline 
    ON alarm_notifications (status, deadline) 
    WHERE status = 'pending';

-- 4. Create trigger function to sync items -> alarm_notifications
CREATE OR REPLACE FUNCTION sync_alarm_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_title TEXT;
    v_body TEXT;
    v_priority TEXT;
    v_tags TEXT[];
    v_has_urgente BOOLEAN;
    v_has_salud BOOLEAN;
    v_has_trabajo BOOLEAN;
    v_repeat_suffix TEXT;
BEGIN
    v_tags := COALESCE(NEW.tags, ARRAY[]::TEXT[]);
    v_has_urgente := 'urgente' = ANY(v_tags) OR 'importante' = ANY(v_tags);
    v_has_salud := 'salud' = ANY(v_tags);
    v_has_trabajo := 'trabajo' = ANY(v_tags);

    -- Determine title based on tags
    IF v_has_urgente THEN
        v_title := '⚠️ URGENTE - KAI';
    ELSIF v_has_salud THEN
        v_title := '💊 KAI - Salud';
    ELSIF v_has_trabajo THEN
        v_title := '💼 KAI - Trabajo';
    ELSE
        v_title := '⏰ KAI - Recordatorio';
    END IF;

    -- Determine body with repeat suffix
    v_body := COALESCE(NEW.content, 'Tienes algo pendiente');
    
    IF NEW.repeat = 'daily' THEN
        v_body := v_body || ' (diario)';
    ELSIF NEW.repeat = 'weekly' THEN
        v_body := v_body || ' (semanal)';
    ELSIF NEW.repeat = 'monthly' THEN
        v_body := v_body || ' (mensual)';
    END IF;

    -- Determine priority
    v_priority := CASE WHEN v_has_urgente THEN 'high' ELSE 'normal' END;

    -- Handle INSERT or UPDATE with deadline set
    IF NEW.deadline IS NOT NULL AND NEW.user_id IS NOT NULL THEN
        INSERT INTO alarm_notifications (item_id, user_id, deadline, title, body, priority, status)
        VALUES (NEW.id, NEW.user_id, NEW.deadline, v_title, v_body, v_priority, 'pending')
        ON CONFLICT (item_id) DO UPDATE SET
            deadline = EXCLUDED.deadline,
            title = EXCLUDED.title,
            body = EXCLUDED.body,
            priority = EXCLUDED.priority,
            status = 'pending',
            updated_at = NOW();
    ELSIF NEW.deadline IS NULL THEN
        -- Deadline was removed, cancel the notification
        UPDATE alarm_notifications
        SET status = 'cancelled', updated_at = NOW()
        WHERE item_id = NEW.id AND status IN ('pending', 'sent');
    END IF;

    RETURN NEW;
END;
$$;

-- 5. Create trigger on items table
DROP TRIGGER IF EXISTS trg_sync_alarm_notification ON items;
CREATE TRIGGER trg_sync_alarm_notification
    AFTER INSERT OR UPDATE ON items
    FOR EACH ROW
    EXECUTE FUNCTION sync_alarm_notification();

-- 6. Enable RLS on alarm_notifications
ALTER TABLE alarm_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own alarms
CREATE POLICY "Users can view their own alarm notifications"
    ON alarm_notifications FOR SELECT
    USING (user_id = auth.uid());

-- Policy: Service role can do everything (trigger uses SECURITY DEFINER)
-- No explicit policy needed for service_role as it bypasses RLS

-- 7. Backfill existing items with deadlines into alarm_notifications
DO $$
DECLARE
    v_item RECORD;
    v_tags TEXT[];
    v_title TEXT;
    v_body TEXT;
    v_priority TEXT;
    v_has_urgente BOOLEAN;
    v_has_salud BOOLEAN;
    v_has_trabajo BOOLEAN;
    v_deadline_ts TIMESTAMPTZ;
    v_status TEXT;
BEGIN
    FOR v_item IN 
        SELECT * FROM items 
        WHERE deadline IS NOT NULL 
          AND user_id IS NOT NULL
          AND id NOT IN (SELECT item_id FROM alarm_notifications)
    LOOP
        -- Convert deadline to timestamptz (handle both numeric epoch and string)
        IF pg_typeof(v_item.deadline) = 'bigint'::regtype OR pg_typeof(v_item.deadline) = 'double precision'::regtype THEN
            v_deadline_ts := to_timestamp(v_item.deadline / 1000.0);
        ELSIF pg_typeof(v_item.deadline) = 'timestamp with time zone'::regtype THEN
            v_deadline_ts := v_item.deadline;
        ELSE
            BEGIN
                v_deadline_ts := v_item.deadline::timestamptz;
            EXCEPTION WHEN OTHER THEN
                CONTINUE;
            END;
        END IF;

        v_tags := COALESCE(v_item.tags, ARRAY[]::TEXT[]);
        v_has_urgente := 'urgente' = ANY(v_tags) OR 'importante' = ANY(v_tags);
        v_has_salud := 'salud' = ANY(v_tags);
        v_has_trabajo := 'trabajo' = ANY(v_tags);

        IF v_has_urgente THEN
            v_title := '⚠️ URGENTE - KAI';
        ELSIF v_has_salud THEN
            v_title := '💊 KAI - Salud';
        ELSIF v_has_trabajo THEN
            v_title := '💼 KAI - Trabajo';
        ELSE
            v_title := '⏰ KAI - Recordatorio';
        END IF;

        v_body := COALESCE(v_item.content, 'Tienes algo pendiente');
        IF v_item.repeat = 'daily' THEN
            v_body := v_body || ' (diario)';
        ELSIF v_item.repeat = 'weekly' THEN
            v_body := v_body || ' (semanal)';
        ELSIF v_item.repeat = 'monthly' THEN
            v_body := v_body || ' (mensual)';
        END IF;

        v_priority := CASE WHEN v_has_urgente THEN 'high' ELSE 'normal' END;

        -- Determine status based on deadline age
        IF v_deadline_ts > NOW() THEN
            v_status := 'pending';
        ELSIF v_deadline_ts > NOW() - INTERVAL '7 days' THEN
            v_status := 'sent';
        ELSE
            CONTINUE; -- Skip older than 7 days
        END IF;

        INSERT INTO alarm_notifications (item_id, user_id, deadline, title, body, priority, status)
        VALUES (v_item.id, v_item.user_id, v_deadline_ts, v_title, v_body, v_priority, v_status);
    END LOOP;
END $$;

-- 8. Create pg_cron job to call check-alarms edge function every minute
-- Note: This requires pg_net to be enabled in your Supabase project settings
SELECT cron.schedule(
    'check-alarms-every-minute',
    '* * * * *',
    $$
        SELECT net.http_post(
            url := 'https://jiufptuxadjavjfbfwka.supabase.co/functions/v1/check-alarms',
            body := '{}'::jsonb,
            headers := '{"Content-Type": "application/json"}'::jsonb
        );
    $$
);
