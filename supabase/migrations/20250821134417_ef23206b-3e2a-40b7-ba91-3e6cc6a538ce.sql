-- Fix search path security issue for workflow function
ALTER FUNCTION public.set_workflow_user_id() SECURITY DEFINER SET search_path = public;