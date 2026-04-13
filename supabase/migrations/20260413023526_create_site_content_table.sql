/*
  # Create site_content table for editable text

  1. New Tables
    - `site_content`
      - `id` (uuid, primary key)
      - `content_key` (text, unique) - identifier for each text element
      - `content_value` (text) - the actual text content
      - `updated_at` (timestamptz) - last update timestamp
      - `updated_by` (uuid) - user who last updated

  2. Security
    - Enable RLS on `site_content` table
    - Anyone authenticated can read site content
    - Only admin user (a88933513@gmail.com) can update/insert/delete
*/

CREATE TABLE IF NOT EXISTS site_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key text UNIQUE NOT NULL,
  content_value text NOT NULL DEFAULT '',
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE site_content ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read site content"
  ON site_content
  FOR SELECT
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admin can insert site content"
  ON site_content
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.jwt() ->> 'email' = 'a88933513@gmail.com'
  );

CREATE POLICY "Admin can update site content"
  ON site_content
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'a88933513@gmail.com')
  WITH CHECK (auth.jwt() ->> 'email' = 'a88933513@gmail.com');

CREATE POLICY "Admin can delete site content"
  ON site_content
  FOR DELETE
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'a88933513@gmail.com');
