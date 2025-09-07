-- Create custom enum for risk levels
DO $$ BEGIN
    CREATE TYPE risk_level AS ENUM ('baixo', 'medio', 'alto');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create custom enum for food consistency  
DO $$ BEGIN
    CREATE TYPE food_consistency_type AS ENUM ('liquida_fina', 'liquida_modificada', 'pastosa', 'normal');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Ensure patients table has proper structure (may already exist)
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'patients') THEN
        CREATE TABLE public.patients (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name TEXT NOT NULL,
            age INTEGER NOT NULL,
            caregiver_id UUID,
            professional_id UUID,
            current_risk_level risk_level DEFAULT 'baixo',
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
    END IF;
END $$;

-- Ensure triage_assessments table exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'triage_assessments') THEN
        CREATE TABLE public.triage_assessments (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            patient_id UUID NOT NULL,
            caregiver_id UUID,
            total_score INTEGER NOT NULL DEFAULT 0,
            risk_level risk_level NOT NULL,
            completed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
    END IF;
END $$;

-- Ensure triage_answers table exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'triage_answers') THEN
        CREATE TABLE public.triage_answers (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            assessment_id UUID NOT NULL,
            question_id TEXT NOT NULL,
            answer_value INTEGER NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
    END IF;
END $$;

-- Ensure daily_records table exists  
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_records') THEN
        CREATE TABLE public.daily_records (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            patient_id UUID NOT NULL,
            caregiver_id UUID,
            record_date DATE NOT NULL,
            food_consistency food_consistency_type NOT NULL,
            observations TEXT DEFAULT '',
            risk_score INTEGER DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
    END IF;
END $$;

-- Ensure daily_record_symptoms table exists
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_record_symptoms') THEN
        CREATE TABLE public.daily_record_symptoms (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            daily_record_id UUID NOT NULL,
            symptom_name TEXT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
        );
    END IF;
END $$;

-- Enable RLS on all tables
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.triage_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.triage_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_record_symptoms ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for patients
DROP POLICY IF EXISTS "Caregivers can create patients" ON public.patients;
CREATE POLICY "Caregivers can create patients" ON public.patients
FOR INSERT WITH CHECK (caregiver_id = auth.uid());

DROP POLICY IF EXISTS "Caregivers can read their patients" ON public.patients;
CREATE POLICY "Caregivers can read their patients" ON public.patients
FOR SELECT USING (caregiver_id = auth.uid());

DROP POLICY IF EXISTS "Professionals can read their patients" ON public.patients;
CREATE POLICY "Professionals can read their patients" ON public.patients
FOR SELECT USING (professional_id = auth.uid());

DROP POLICY IF EXISTS "Caregivers can update their patients" ON public.patients;
CREATE POLICY "Caregivers can update their patients" ON public.patients
FOR UPDATE USING (caregiver_id = auth.uid());

-- Create RLS policies for triage_assessments
DROP POLICY IF EXISTS "Caregivers can create assessments" ON public.triage_assessments;
CREATE POLICY "Caregivers can create assessments" ON public.triage_assessments
FOR INSERT WITH CHECK (caregiver_id = auth.uid());

DROP POLICY IF EXISTS "Users can read assessments for their patients" ON public.triage_assessments;
CREATE POLICY "Users can read assessments for their patients" ON public.triage_assessments
FOR SELECT USING (
    caregiver_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM public.patients p 
        WHERE p.id = triage_assessments.patient_id 
        AND p.professional_id = auth.uid()
    )
);

-- Create RLS policies for triage_answers
DROP POLICY IF EXISTS "Caregivers can create answers" ON public.triage_answers;
CREATE POLICY "Caregivers can create answers" ON public.triage_answers
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.triage_assessments ta
        WHERE ta.id = triage_answers.assessment_id 
        AND ta.caregiver_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can read answers for their assessments" ON public.triage_answers;
CREATE POLICY "Users can read answers for their assessments" ON public.triage_answers
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.triage_assessments ta
        WHERE ta.id = triage_answers.assessment_id 
        AND (
            ta.caregiver_id = auth.uid() OR 
            EXISTS (
                SELECT 1 FROM public.patients p 
                WHERE p.id = ta.patient_id 
                AND p.professional_id = auth.uid()
            )
        )
    )
);

-- Create RLS policies for daily_records
DROP POLICY IF EXISTS "Caregivers can create records" ON public.daily_records;
CREATE POLICY "Caregivers can create records" ON public.daily_records
FOR INSERT WITH CHECK (caregiver_id = auth.uid());

DROP POLICY IF EXISTS "Users can read records for their patients" ON public.daily_records;
CREATE POLICY "Users can read records for their patients" ON public.daily_records
FOR SELECT USING (
    caregiver_id = auth.uid() OR 
    EXISTS (
        SELECT 1 FROM public.patients p 
        WHERE p.id = daily_records.patient_id 
        AND p.professional_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Caregivers can update their records" ON public.daily_records;
CREATE POLICY "Caregivers can update their records" ON public.daily_records
FOR UPDATE USING (caregiver_id = auth.uid());

-- Create RLS policies for daily_record_symptoms
DROP POLICY IF EXISTS "Caregivers can create symptoms" ON public.daily_record_symptoms;
CREATE POLICY "Caregivers can create symptoms" ON public.daily_record_symptoms
FOR INSERT WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.daily_records dr
        WHERE dr.id = daily_record_symptoms.daily_record_id 
        AND dr.caregiver_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can read symptoms for accessible records" ON public.daily_record_symptoms;
CREATE POLICY "Users can read symptoms for accessible records" ON public.daily_record_symptoms
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.daily_records dr
        WHERE dr.id = daily_record_symptoms.daily_record_id 
        AND (
            dr.caregiver_id = auth.uid() OR 
            EXISTS (
                SELECT 1 FROM public.patients p 
                WHERE p.id = dr.patient_id 
                AND p.professional_id = auth.uid()
            )
        )
    )
);