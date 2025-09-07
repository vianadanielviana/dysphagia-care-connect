-- Fix foreign key constraints in daily_records table
-- The issue is that caregiver_id references 'users' table but data is in 'profiles' table

-- Drop the existing foreign key constraint
ALTER TABLE daily_records DROP CONSTRAINT IF EXISTS daily_records_caregiver_id_fkey;

-- Add the correct foreign key constraint pointing to profiles table
ALTER TABLE daily_records 
ADD CONSTRAINT daily_records_caregiver_id_fkey 
FOREIGN KEY (caregiver_id) REFERENCES profiles(id) ON DELETE CASCADE;