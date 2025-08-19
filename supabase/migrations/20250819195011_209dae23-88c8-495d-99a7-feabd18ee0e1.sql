-- Fix RLS policies for medical data protection

-- Update pacientes table RLS policies
DROP POLICY IF EXISTS "Pacientes são visíveis para usuários autenticados" ON public.pacientes;
DROP POLICY IF EXISTS "Usuários autenticados podem criar pacientes" ON public.pacientes;
DROP POLICY IF EXISTS "Usuários podem atualizar pacientes que cadastraram" ON public.pacientes;
DROP POLICY IF EXISTS "Usuários podem excluir pacientes que cadastraram" ON public.pacientes;

-- Create proper RLS policies for pacientes
CREATE POLICY "Users can view patients they created or are assigned to" 
ON public.pacientes 
FOR SELECT 
USING (auth.uid() = usuario_cadastro_id);

CREATE POLICY "Users can create patients" 
ON public.pacientes 
FOR INSERT 
WITH CHECK (auth.uid() = usuario_cadastro_id);

CREATE POLICY "Users can update their patients" 
ON public.pacientes 
FOR UPDATE 
USING (auth.uid() = usuario_cadastro_id);

CREATE POLICY "Users can delete their patients" 
ON public.pacientes 
FOR DELETE 
USING (auth.uid() = usuario_cadastro_id);

-- Fix chat_memory RLS policies 
DROP POLICY IF EXISTS "Enable read access for all users" ON public.chat_memory;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.chat_memory;

-- Add user_id column to chat_memory for proper access control
ALTER TABLE public.chat_memory ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create secure RLS policies for chat_memory
CREATE POLICY "Users can view their own chat history" 
ON public.chat_memory 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat messages" 
ON public.chat_memory 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Fix chat_sessions RLS policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public.chat_sessions;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.chat_sessions;

-- Add user_id column to chat_sessions for proper access control
ALTER TABLE public.chat_sessions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

-- Create secure RLS policies for chat_sessions
CREATE POLICY "Users can view their own chat sessions" 
ON public.chat_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own chat sessions" 
ON public.chat_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own chat sessions" 
ON public.chat_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create a trigger to automatically set user_id on insert
CREATE OR REPLACE FUNCTION set_user_id_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply triggers to automatically set user_id
CREATE TRIGGER set_chat_memory_user_id
  BEFORE INSERT ON public.chat_memory
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id_on_insert();

CREATE TRIGGER set_chat_sessions_user_id
  BEFORE INSERT ON public.chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id_on_insert();

-- Update existing functions to be secure
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, nome, tipo_usuario, is_approved)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'tipo_usuario', 'cuidador'),
    CASE 
      WHEN NEW.email = 'viana.vianadaniel@outlook.com' THEN true
      ELSE false
    END
  );
  RETURN NEW;
END;
$function$;

-- Update other functions to be secure
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$;

-- Create a security definer function to check user roles
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT tipo_usuario FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER STABLE;