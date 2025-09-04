-- Fix security vulnerability in chat_memory_n8n table
-- Add user_id column for proper access control
ALTER TABLE public.chat_memory_n8n 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Enable Row Level Security
ALTER TABLE public.chat_memory_n8n ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for secure access
CREATE POLICY "Users can view their own chat history" 
ON public.chat_memory_n8n 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat messages" 
ON public.chat_memory_n8n 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Create function to automatically set user_id on insert
CREATE OR REPLACE FUNCTION public.set_chat_memory_n8n_user_id()
RETURNS TRIGGER AS $$
BEGIN
    NEW.user_id = auth.uid();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically set user_id
CREATE TRIGGER set_chat_memory_n8n_user_id_trigger
    BEFORE INSERT ON public.chat_memory_n8n
    FOR EACH ROW
    EXECUTE FUNCTION public.set_chat_memory_n8n_user_id();