CREATE TABLE IF NOT EXISTS agent_configurations (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_role text NOT NULL UNIQUE,
  identity_config jsonb DEFAULT '{}'::jsonb,
  model_config jsonb DEFAULT '{}'::jsonb,
  environment_variables jsonb DEFAULT '[]'::jsonb,
  permissions_config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_agent_configurations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_agent_configurations_updated_at
BEFORE UPDATE ON agent_configurations
FOR EACH ROW
EXECUTE FUNCTION update_agent_configurations_updated_at();

-- RLS
ALTER TABLE agent_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public Read Access agent_configurations" ON agent_configurations FOR SELECT USING (true);
CREATE POLICY "Public Insert Access agent_configurations" ON agent_configurations FOR INSERT WITH CHECK (true);
CREATE POLICY "Public Update Access agent_configurations" ON agent_configurations FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Public Delete Access agent_configurations" ON agent_configurations FOR DELETE USING (true);
