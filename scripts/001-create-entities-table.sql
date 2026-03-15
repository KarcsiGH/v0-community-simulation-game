-- Create entities table for community simulation
-- This stores organizations, individuals, and groups

CREATE TABLE IF NOT EXISTS entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Basic Identity
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  mission TEXT,
  founded_date TEXT,
  legal_structure TEXT,
  website TEXT,
  headquarters_location TEXT,
  geographic_scope TEXT,
  
  -- Financial Capacity (stored as JSONB for flexibility)
  financials JSONB DEFAULT '{}'::jsonb,
  
  -- Human Resources (stored as JSONB)
  human_resources JSONB DEFAULT '{}'::jsonb,
  
  -- Programs & Services (stored as JSONB)
  programs JSONB DEFAULT '{}'::jsonb,
  
  -- Influence & Power (stored as JSONB)
  influence JSONB DEFAULT '{}'::jsonb,
  
  -- Relationships (stored as JSONB)
  relationships JSONB DEFAULT '{}'::jsonb,
  
  -- Strategic Orientation (stored as JSONB)
  strategic JSONB DEFAULT '{}'::jsonb,
  
  -- Advanced Attributes (stored as JSONB)
  advanced JSONB DEFAULT '{}'::jsonb,
  
  -- Data collection metadata
  data_sources JSONB DEFAULT '[]'::jsonb,
  data_confidence JSONB DEFAULT '{}'::jsonb,
  last_data_refresh TIMESTAMPTZ
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name);
CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type);

-- Create simulation_configs table
CREATE TABLE IF NOT EXISTS simulation_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  name TEXT NOT NULL,
  description TEXT,
  time_scale TEXT,
  settings JSONB DEFAULT '{}'::jsonb
);

-- Enable Row Level Security (currently open access, can add auth later)
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_configs ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no auth required for now)
CREATE POLICY "Allow public read access to entities" ON entities
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to entities" ON entities
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to entities" ON entities
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to entities" ON entities
  FOR DELETE USING (true);

CREATE POLICY "Allow public read access to simulation_configs" ON simulation_configs
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to simulation_configs" ON simulation_configs
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to simulation_configs" ON simulation_configs
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to simulation_configs" ON simulation_configs
  FOR DELETE USING (true);
