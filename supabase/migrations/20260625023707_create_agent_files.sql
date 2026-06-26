CREATE TABLE IF NOT EXISTS agent_files (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_role text NOT NULL,
  file_name text NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(agent_role, file_name)
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_agent_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agent_files_updated_at
BEFORE UPDATE ON agent_files
FOR EACH ROW
EXECUTE FUNCTION update_agent_files_updated_at();

-- RLS
ALTER TABLE agent_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Access agent_files" ON agent_files FOR SELECT USING (true);
CREATE POLICY "Public Insert Access agent_files" ON agent_files FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access agent_files" ON agent_files FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Access agent_files" ON agent_files FOR DELETE USING (true);
