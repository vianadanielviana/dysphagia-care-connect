-- Fix security vulnerability in chat_memory_n8n view
-- Enable RLS and create security policies for the view

-- Step 1: Enable Row Level Security on chat_memory_n8n view
ALTER VIEW public.chat_memory_n8n ENABLE ROW LEVEL SECURITY;

-- Step 2: Create RLS policies to restrict access to users' own chat data

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