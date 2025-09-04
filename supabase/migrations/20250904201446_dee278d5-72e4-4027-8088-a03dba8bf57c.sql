-- Fix security vulnerability in chat_memory_n8n table
-- Add user_id column, enable RLS, and create security policies

-- Step 1: Add user_id column to chat_memory_n8n table
ALTER TABLE public.chat_memory_n8n 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2: Enable Row Level Security on chat_memory_n8n table
ALTER TABLE public.chat_memory_n8n ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies to restrict access to users' own chat data

-- Policy for SELECT: Users can only view their own chat history
CREATE POLICY "Users can view their own chat history" 
ON public.chat_memory_n8n 
FOR SELECT 
USING (auth.uid() = user_id);

-- Policy for INSERT: Users can only create their own chat messages
CREATE POLICY "Users can create their own chat messages" 
ON public.chat_memory_n8n 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Policy for UPDATE: Users can only update their own chat messages
CREATE POLICY "Users can update their own chat messages" 
ON public.chat_memory_n8n 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy for DELETE: Users can only delete their own chat messages
CREATE POLICY "Users can delete their own chat messages" 
ON public.chat_memory_n8n 
FOR DELETE 
USING (auth.uid() = user_id);

-- Step 4: Create trigger to automatically set user_id on insert
CREATE OR REPLACE FUNCTION public.set_chat_memory_n8n_user_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.user_id = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER set_chat_memory_n8n_user_id_trigger
    BEFORE INSERT ON public.chat_memory_n8n
    FOR EACH ROW
    EXECUTE FUNCTION public.set_chat_memory_n8n_user_id();

-- Step 5: Update existing records to have user_id (if any exist)
-- Note: This sets all existing records to NULL user_id since we can't determine the original user
-- In production, you might want to handle this differently based on session_id or other criteria
UPDATE public.chat_memory_n8n 
SET user_id = NULL 
WHERE user_id IS NULL;