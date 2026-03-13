ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS timer_rounding_minutes INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS business_name TEXT,
  ADD COLUMN IF NOT EXISTS business_address TEXT;
