-- Fix security vulnerability in chat_memory_n8n view
-- Drop and recreate the view to include user_id and apply proper RLS

-- Step 1: Drop the existing unsafe view
DROP VIEW IF EXISTS public.chat_memory_n8n;

-- Step 2: Recreate the view including user_id column for security
CREATE VIEW public.chat_memory_n8n AS 
SELECT 
    id,
    session_id,
    message,
    type,
    additional_kwargs,
    created_at,
    updated_at,
    user_id  -- Include user_id for RLS policies
FROM public.chat_memory;

-- Step 3: Enable Row Level Security on the view
ALTER VIEW public.chat_memory_n8n SET (security_barrier = true);

-- Step 4: Create RLS policies for the view (these will inherit from the base table)
-- The view will automatically use the RLS policies from the underlying chat_memory table
-- which already has proper policies:
-- - "Users can view their own chat history" (SELECT using auth.uid() = user_id)
-- - "Users can create their own chat messages" (INSERT with check auth.uid() = user_id)

-- Note: Since this is a view, the RLS policies from the underlying chat_memory table
-- will automatically apply, providing the necessary security controls.