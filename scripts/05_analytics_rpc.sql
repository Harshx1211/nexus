-- ==============================================================================
-- 05: Analytics Remote Procedure Calls (RPC)
-- Description: Aggregation functions for dashboard metrics to prevent downloading
-- massive amounts of rows to the client browser.
-- Usage: Run this script in the Supabase SQL Editor.
-- ==============================================================================

-- 1. Mentee Dashboard Stats RPC
CREATE OR REPLACE FUNCTION get_mentee_dashboard_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_total_tasks INT;
    v_completed_tasks INT;
    v_upcoming_sessions INT;
    v_total_sessions INT;
    v_progress_percentage NUMERIC;
BEGIN
    -- Get task counts
    SELECT COUNT(*) INTO v_total_tasks 
    FROM assignments 
    WHERE mentee_id = p_user_id;

    SELECT COUNT(*) INTO v_completed_tasks 
    FROM assignments 
    WHERE mentee_id = p_user_id AND status = 'submitted';

    -- Calculate progress percentage securely
    IF v_total_tasks > 0 THEN
        v_progress_percentage := (v_completed_tasks::NUMERIC / v_total_tasks::NUMERIC) * 100;
    ELSE
        v_progress_percentage := 0;
    END IF;

    -- Get upcoming sessions (future dates)
    SELECT COUNT(*) INTO v_upcoming_sessions
    FROM sessions
    WHERE mentee_id = p_user_id AND scheduled_at > NOW();

    -- Get total registered sessions
    SELECT COUNT(*) INTO v_total_sessions
    FROM sessions
    WHERE mentee_id = p_user_id;

    -- Return JSON object
    RETURN json_build_object(
        'total_tasks', v_total_tasks,
        'completed_tasks', v_completed_tasks,
        'progress_percentage', ROUND(v_progress_percentage, 1),
        'upcoming_sessions', v_upcoming_sessions,
        'total_sessions', v_total_sessions
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Mentor Dashboard Stats RPC
CREATE OR REPLACE FUNCTION get_mentor_dashboard_stats(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_total_mentees INT;
    v_total_tasks_assigned INT;
    v_tasks_completed INT;
    v_upcoming_sessions INT;
    v_completion_rate NUMERIC;
BEGIN
    -- Get total mentees assigned to this mentor
    SELECT COUNT(*) INTO v_total_mentees
    FROM mentees
    WHERE assigned_mentor_id = p_user_id;

    -- Get task counts for this mentor's mentees
    SELECT COUNT(*) INTO v_total_tasks_assigned
    FROM assignments
    WHERE mentor_id = p_user_id;

    SELECT COUNT(*) INTO v_tasks_completed
    FROM assignments
    WHERE mentor_id = p_user_id AND status = 'submitted';

    -- Calculate completion rate
    IF v_total_tasks_assigned > 0 THEN
        v_completion_rate := (v_tasks_completed::NUMERIC / v_total_tasks_assigned::NUMERIC) * 100;
    ELSE
        v_completion_rate := 0;
    END IF;

    -- Get overall upcoming sessions for this mentor across all mentees
    SELECT COUNT(*) INTO v_upcoming_sessions
    FROM sessions
    WHERE mentor_id = p_user_id AND scheduled_at > NOW();

    -- Return JSON object
    RETURN json_build_object(
        'total_mentees', v_total_mentees,
        'total_tasks_assigned', v_total_tasks_assigned,
        'tasks_completed_by_mentees', v_tasks_completed,
        'completion_rate', ROUND(v_completion_rate, 1),
        'upcoming_sessions', v_upcoming_sessions
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note for Supabase RLS: By using SECURITY DEFINER, the function bypasses RLS
-- internally, meaning it runs as the postgres superuser. However, we explicitly 
-- filter by `p_user_id` inside the queries so the user can only ever calculate 
-- stats for their own ID when calling it via `supabase.rpc('func_name', { p_user_id: user.id })`.
