-- Create user roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'fonoaudiologo', 'cuidador');

-- Create user_roles table
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles table
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all roles"
ON public.user_roles FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Enable RLS on tables missing it (skip views)
ALTER TABLE public.follow_up ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interacoes ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for follow_up
CREATE POLICY "Admins can view all follow_up"
ON public.follow_up FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert follow_up"
ON public.follow_up FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Add RLS policies for tickets  
CREATE POLICY "Users can view their own tickets"
ON public.tickets FOR SELECT
TO authenticated
USING (usuario_id = auth.uid()::text OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can create tickets"
ON public.tickets FOR INSERT
TO authenticated
WITH CHECK (usuario_id = auth.uid()::text);

CREATE POLICY "Admins can update tickets"
ON public.tickets FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Add RLS policies for interacoes
CREATE POLICY "Admins can view analytics"
ON public.interacoes FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert analytics"
ON public.interacoes FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Migrate existing admin users to user_roles table
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email IN ('viana.vianadaniel@outlook.com', 'adrianepaesdagama@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;

-- Migrate existing approved professionals to their roles
INSERT INTO public.user_roles (user_id, role)
SELECT id, 
  CASE 
    WHEN tipo_usuario = 'fonoaudiologo' THEN 'fonoaudiologo'::app_role
    WHEN tipo_usuario = 'cuidador' THEN 'cuidador'::app_role
    ELSE 'cuidador'::app_role
  END
FROM public.profiles
WHERE is_approved = true
ON CONFLICT (user_id, role) DO NOTHING;