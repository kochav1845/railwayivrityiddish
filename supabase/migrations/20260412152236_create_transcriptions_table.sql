/*
  # Create Transcriptions Table

  ## Purpose
  Stores Yiddish audio transcription records produced by the ivrit-ai Whisper model.

  ## New Tables
  - `transcriptions`
    - `id` (uuid, primary key)
    - `filename` (text) - original audio file name
    - `transcription` (text) - the Yiddish transcription result
    - `duration_seconds` (numeric, nullable) - audio duration if available
    - `file_size_bytes` (bigint, nullable) - size of uploaded file
    - `created_at` (timestamptz) - when the transcription was created

  ## Security
  - RLS enabled
  - Public insert and select allowed (no auth required for this public tool)
*/

CREATE TABLE IF NOT EXISTS transcriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  filename text NOT NULL DEFAULT '',
  transcription text NOT NULL DEFAULT '',
  duration_seconds numeric,
  file_size_bytes bigint,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transcriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert transcriptions"
  ON transcriptions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view transcriptions"
  ON transcriptions
  FOR SELECT
  TO anon, authenticated
  USING (true);
