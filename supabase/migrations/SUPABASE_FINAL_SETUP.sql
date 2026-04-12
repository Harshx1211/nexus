-- ========================================================
-- NEXUS SUPABASE FINAL LOGIC & TRIGGERS
-- ========================================================
-- This script fixes the "0 Mentees" issue and restores 
-- real-time notifications across the entire platform.
-- ========================================================

-- 1. FUNCTION: Handle New User Registration (Profile Auto-Provisioning)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (id, email, full_name, role, created_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'New User'),
    COALESCE(new.raw_user_meta_data->>'role', 'mentee'),
    now()
  ) ON CONFLICT (id) DO NOTHING;

  -- If it's a mentee, ensure they have a row in the mentees table
  IF (COALESCE(new.raw_user_meta_data->>'role', 'mentee') = 'mentee') THEN
    INSERT INTO public.mentees (id, created_at)
    VALUES (new.id, now())
    ON CONFLICT (id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- 2. FUNCTION: Handle Mentor Request Acceptance (The "0 Mentees" Fix)
CREATE OR REPLACE FUNCTION public.handle_mentor_request_accepted()
RETURNS trigger AS $$
BEGIN
  -- Check if the status changed to 'accepted'
  IF (NEW.status = 'accepted' AND (OLD.status IS NULL OR OLD.status != 'accepted')) THEN
    
    -- Update the mentees table to set the assigned_mentor_id
    UPDATE public.mentees
    SET 
      assigned_mentor_id = NEW.mentor_id,
      assignment_date = now(),
      updated_at = now()
    WHERE id = NEW.mentee_id;

    -- Create a notification for the Mentor
    INSERT INTO public.notifications (recipient_id, type, title, content, link, is_read, created_at)
    SELECT 
      NEW.mentor_id, 
      'request', 
      'Request Accepted!', 
      p.full_name || ' is now your mentee.', 
      '/dashboard/mentees', 
      false, 
      now()
    FROM public.profiles p WHERE p.id = NEW.mentee_id;

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for mentor request status updates
DROP TRIGGER IF EXISTS on_mentor_request_accepted ON public.mentor_requests;
CREATE TRIGGER on_mentor_request_accepted
  AFTER UPDATE ON public.mentor_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_mentor_request_accepted();


-- 3. FUNCTION: Handle New Announcements (Broadcast)
CREATE OR REPLACE FUNCTION public.handle_new_announcement()
RETURNS trigger AS $$
BEGIN
  -- Notify all mentees assigned to this mentor
  INSERT INTO public.notifications (recipient_id, type, title, content, link, is_read, created_at)
  SELECT 
    m.id, 
    'message', 
    'New Announcement', 
    NEW.title, 
    '/dashboard/announcements', 
    false, 
    now()
  FROM public.mentees m
  WHERE m.assigned_mentor_id = NEW.mentor_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new announcements
DROP TRIGGER IF EXISTS on_announcement_created ON public.announcements;
CREATE TRIGGER on_announcement_created
  AFTER INSERT ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_announcement();


-- 4. FUNCTION: Handle New Sessions (Scheduling Notification)
CREATE OR REPLACE FUNCTION public.handle_new_session()
RETURNS trigger AS $$
BEGIN
  -- Notify the mentee
  IF (NEW.mentee_id IS NOT NULL) THEN
    INSERT INTO public.notifications (recipient_id, type, title, content, link, is_read, created_at)
    VALUES (
      NEW.mentee_id, 
      'session', 
      'New Session Scheduled', 
      'Topic: ' || NEW.title || ' at ' || to_char(NEW.scheduled_at, 'DD Mon, HH:MI AM'), 
      '/dashboard/sessions', 
      false, 
      now()
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new sessions
DROP TRIGGER IF EXISTS on_session_created ON public.sessions;
CREATE TRIGGER on_session_created
  AFTER INSERT ON public.sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_session();
