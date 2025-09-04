-- Enable RLS on tables that don't have it enabled
ALTER TABLE public.chat_memory_n8n ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contatos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followup_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reminder_log ENABLE ROW LEVEL SECURITY;

-- Create restrictive policies for chat_memory_n8n (admin only access)
CREATE POLICY "Admin can view chat_memory_n8n" 
ON public.chat_memory_n8n 
FOR SELECT 
USING ((auth.jwt() ->> 'email'::text) = 'viana.vianadaniel@outlook.com'::text);

CREATE POLICY "Admin can insert chat_memory_n8n" 
ON public.chat_memory_n8n 
FOR INSERT 
WITH CHECK ((auth.jwt() ->> 'email'::text) = 'viana.vianadaniel@outlook.com'::text);

-- Create restrictive policies for contatos (admin only access)
CREATE POLICY "Admin can view contatos" 
ON public.contatos 
FOR SELECT 
USING ((auth.jwt() ->> 'email'::text) = 'viana.vianadaniel@outlook.com'::text);

CREATE POLICY "Admin can insert contatos" 
ON public.contatos 
FOR INSERT 
WITH CHECK ((auth.jwt() ->> 'email'::text) = 'viana.vianadaniel@outlook.com'::text);

CREATE POLICY "Admin can update contatos" 
ON public.contatos 
FOR UPDATE 
USING ((auth.jwt() ->> 'email'::text) = 'viana.vianadaniel@outlook.com'::text)
WITH CHECK ((auth.jwt() ->> 'email'::text) = 'viana.vianadaniel@outlook.com'::text);

CREATE POLICY "Admin can delete contatos" 
ON public.contatos 
FOR DELETE 
USING ((auth.jwt() ->> 'email'::text) = 'viana.vianadaniel@outlook.com'::text);

-- Create restrictive policies for followup_logs (admin only access)
CREATE POLICY "Admin can view followup_logs" 
ON public.followup_logs 
FOR SELECT 
USING ((auth.jwt() ->> 'email'::text) = 'viana.vianadaniel@outlook.com'::text);

CREATE POLICY "Admin can insert followup_logs" 
ON public.followup_logs 
FOR INSERT 
WITH CHECK ((auth.jwt() ->> 'email'::text) = 'viana.vianadaniel@outlook.com'::text);

-- Create restrictive policies for reminder_log (admin only access)
CREATE POLICY "Admin can view reminder_log" 
ON public.reminder_log 
FOR SELECT 
USING ((auth.jwt() ->> 'email'::text) = 'viana.vianadaniel@outlook.com'::text);

CREATE POLICY "Admin can insert reminder_log" 
ON public.reminder_log 
FOR INSERT 
WITH CHECK ((auth.jwt() ->> 'email'::text) = 'viana.vianadaniel@outlook.com'::text);