-- Migration: Add simulation enhancement tables and columns
-- This adds support for: events, resources, milestones, entity memory, and branch probability

-- 1. Add branch probability to simulations
ALTER TABLE simulations 
ADD COLUMN IF NOT EXISTS branch_probability real DEFAULT 0.5;

COMMENT ON COLUMN simulations.branch_probability IS 'Calculated probability (0-1) that this branch scenario will occur';

-- 2. Create simulation_events table for event injection
CREATE TABLE IF NOT EXISTS simulation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  year_number integer NOT NULL,
  event_type text NOT NULL, -- 'policy_change', 'election', 'economic', 'crisis', 'opportunity', 'custom'
  title text NOT NULL,
  description text NOT NULL,
  impact_level text NOT NULL DEFAULT 'moderate', -- 'minor', 'moderate', 'major', 'critical'
  affected_entities jsonb DEFAULT '[]'::jsonb, -- array of entity IDs most affected
  parameters jsonb DEFAULT '{}'::jsonb, -- additional event parameters
  is_processed boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  processed_at timestamp with time zone
);

-- RLS for simulation_events
ALTER TABLE simulation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to simulation_events" ON simulation_events FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to simulation_events" ON simulation_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to simulation_events" ON simulation_events FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to simulation_events" ON simulation_events FOR DELETE USING (true);

-- 3. Create simulation_resource_commitments table
CREATE TABLE IF NOT EXISTS simulation_resource_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_year_id uuid NOT NULL REFERENCES simulation_years(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  resource_type text NOT NULL, -- 'funding', 'staff', 'political_capital', 'in_kind', 'volunteer'
  amount text, -- e.g., "$50,000", "5 FTE", "High"
  amount_numeric real, -- numeric value for calculations
  purpose text,
  commitment_level text DEFAULT 'committed', -- 'pledged', 'committed', 'delivered'
  created_at timestamp with time zone DEFAULT now()
);

-- RLS for simulation_resource_commitments
ALTER TABLE simulation_resource_commitments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to simulation_resource_commitments" ON simulation_resource_commitments FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to simulation_resource_commitments" ON simulation_resource_commitments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to simulation_resource_commitments" ON simulation_resource_commitments FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to simulation_resource_commitments" ON simulation_resource_commitments FOR DELETE USING (true);

-- 4. Create simulation_milestones table for success criteria
CREATE TABLE IF NOT EXISTS simulation_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  milestone_type text NOT NULL, -- 'political_support', 'funding', 'coalition_size', 'policy_passage', 'public_opinion', 'custom'
  target_value text NOT NULL, -- e.g., "majority council support", "$1M", "10 organizations"
  target_numeric real, -- numeric target for calculations
  current_value text,
  current_numeric real,
  status text DEFAULT 'not_started', -- 'not_started', 'in_progress', 'achieved', 'failed'
  achieved_year integer,
  weight real DEFAULT 1.0, -- importance weight for overall success calculation
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- RLS for simulation_milestones
ALTER TABLE simulation_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to simulation_milestones" ON simulation_milestones FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to simulation_milestones" ON simulation_milestones FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to simulation_milestones" ON simulation_milestones FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to simulation_milestones" ON simulation_milestones FOR DELETE USING (true);

-- 5. Create simulation_entity_memory table for entity consistency
CREATE TABLE IF NOT EXISTS simulation_entity_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id uuid NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  year_number integer NOT NULL,
  position_summary text, -- summary of entity's position at end of this year
  commitments jsonb DEFAULT '[]'::jsonb, -- array of commitments made
  relationships_state jsonb DEFAULT '{}'::jsonb, -- state of relationships with other entities
  resources_committed jsonb DEFAULT '{}'::jsonb, -- resources committed so far
  key_decisions jsonb DEFAULT '[]'::jsonb, -- key decisions made
  stance_trajectory text, -- 'increasingly_supportive', 'stable', 'increasingly_opposed', 'volatile'
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(simulation_id, entity_id, year_number)
);

-- RLS for simulation_entity_memory
ALTER TABLE simulation_entity_memory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read access to simulation_entity_memory" ON simulation_entity_memory FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to simulation_entity_memory" ON simulation_entity_memory FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to simulation_entity_memory" ON simulation_entity_memory FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to simulation_entity_memory" ON simulation_entity_memory FOR DELETE USING (true);

-- 6. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_simulation_events_simulation_year ON simulation_events(simulation_id, year_number);
CREATE INDEX IF NOT EXISTS idx_simulation_resource_commitments_year ON simulation_resource_commitments(simulation_year_id);
CREATE INDEX IF NOT EXISTS idx_simulation_milestones_simulation ON simulation_milestones(simulation_id);
CREATE INDEX IF NOT EXISTS idx_simulation_entity_memory_lookup ON simulation_entity_memory(simulation_id, entity_id);
CREATE INDEX IF NOT EXISTS idx_simulation_relationship_changes_year ON simulation_relationship_changes(simulation_year_id);
CREATE INDEX IF NOT EXISTS idx_simulation_coalitions_simulation ON simulation_coalitions(simulation_id);
