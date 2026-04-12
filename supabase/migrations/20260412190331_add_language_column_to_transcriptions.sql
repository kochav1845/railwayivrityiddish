/*
  # Add language column to transcriptions

  1. Modified Tables
    - `transcriptions`
      - Added `language` (text) - the language used for transcription (hebrew or yiddish), defaults to 'yiddish'

  2. Notes
    - Existing rows will default to 'yiddish' since this was originally a Yiddish transcriber
    - No security changes needed, existing RLS policies cover the new column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transcriptions' AND column_name = 'language'
  ) THEN
    ALTER TABLE transcriptions ADD COLUMN language text NOT NULL DEFAULT 'yiddish';
  END IF;
END $$;