/*
  # Add output_language column to transcriptions

  1. Modified Tables
    - `transcriptions`
      - `output_language` (text, default 'yiddish') - The target output language for the transcription
      - Rename conceptual use of `language` to mean "input language"

  2. Notes
    - Existing rows default to 'yiddish' for output_language
    - The `language` column continues to represent the input language
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transcriptions' AND column_name = 'output_language'
  ) THEN
    ALTER TABLE transcriptions ADD COLUMN output_language text NOT NULL DEFAULT 'yiddish';
  END IF;
END $$;