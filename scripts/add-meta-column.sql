-- Add meta column to campaigns table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'campaigns' 
        AND column_name = 'meta'
    ) THEN 
        ALTER TABLE campaigns 
        ADD COLUMN meta JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;
