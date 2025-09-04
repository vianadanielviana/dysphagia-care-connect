-- Fix security vulnerability by dropping unused chat_memory_n8n view
-- This view was not being used in the application and posed a security risk
-- The underlying chat_memory table already has proper RLS policies

DROP VIEW IF EXISTS public.chat_memory_n8n;