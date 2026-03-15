-- Simulation Engine Tables
-- Run this script to create tables for the community simulation game

-- Simulations: Individual simulation runs
CREATE TABLE IF NOT EXISTS simulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  config_id UUID REFERENCES simulation_configs(id),
  name TEXT NOT NULL,
  description TEXT,
  scenario TEXT NOT NULL, -- The intervention/event being simulated
  status TEXT NOT NULL DEFAULT 'draft', -- draft, running, paused, completed
  current_year INTEGER DEFAULT 0,
  total_years INTEGER NOT NULL DEFAULT 5,
  starting_conditions JSONB DEFAULT '{}', -- Snapshot of community state at start
  parameters JSONB DEFAULT '{}', -- AI model settings, detail level, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Simulation Years: Each year cycle within a simulation
CREATE TABLE IF NOT EXISTS simulation_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  year_number INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, in_progress, completed
  year_scenario TEXT, -- Specific events/context for this year
  year_summary TEXT, -- AI-generated narrative of what happened
  metrics JSONB DEFAULT '{}', -- Quantitative outcomes
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(simulation_id, year_number)
);

-- Simulation Responses: Each entity's response per year
CREATE TABLE IF NOT EXISTS simulation_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_year_id UUID NOT NULL REFERENCES simulation_years(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  response_type TEXT NOT NULL, -- decision, statement, action, negotiation
  content TEXT NOT NULL, -- The actual response text
  decision JSONB, -- Structured decision data (e.g., {action: "apply_for_grant", target: "...", amount: ...})
  reasoning TEXT, -- Why the entity made this decision (based on profile)
  confidence REAL, -- How confident the AI is in this response (0-1)
  influenced_by JSONB DEFAULT '[]', -- Array of entity IDs that influenced this response
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(simulation_year_id, entity_id, response_type)
);

-- Simulation Coalitions: Alliances formed during simulation
CREATE TABLE IF NOT EXISTS simulation_coalitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  purpose TEXT,
  formed_year INTEGER NOT NULL,
  dissolved_year INTEGER, -- NULL if still active
  status TEXT NOT NULL DEFAULT 'active', -- active, dissolved
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Coalition Members: Entities in each coalition
CREATE TABLE IF NOT EXISTS simulation_coalition_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coalition_id UUID NOT NULL REFERENCES simulation_coalitions(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  role TEXT, -- leader, member, supporter
  joined_year INTEGER NOT NULL,
  left_year INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(coalition_id, entity_id)
);

-- Simulation Relationship Changes: Track how relationships evolve
CREATE TABLE IF NOT EXISTS simulation_relationship_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_year_id UUID NOT NULL REFERENCES simulation_years(id) ON DELETE CASCADE,
  entity_a_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  entity_b_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  change_type TEXT NOT NULL, -- strengthened, weakened, formed, dissolved
  previous_strength TEXT, -- none, weak, moderate, strong
  new_strength TEXT NOT NULL, -- none, weak, moderate, strong
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Simulation Outcomes: Final results
CREATE TABLE IF NOT EXISTS simulation_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  simulation_id UUID NOT NULL REFERENCES simulations(id) ON DELETE CASCADE,
  outcome_type TEXT NOT NULL, -- goal_achieved, coalition_formed, funding_secured, policy_changed
  description TEXT NOT NULL,
  affected_entities JSONB DEFAULT '[]', -- Array of entity IDs
  metrics JSONB DEFAULT '{}', -- Quantitative data
  year_achieved INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE simulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_coalitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_coalition_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_relationship_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE simulation_outcomes ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for public access (matching existing tables)
CREATE POLICY "Allow public read access to simulations" ON simulations FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to simulations" ON simulations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to simulations" ON simulations FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to simulations" ON simulations FOR DELETE USING (true);

CREATE POLICY "Allow public read access to simulation_years" ON simulation_years FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to simulation_years" ON simulation_years FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to simulation_years" ON simulation_years FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to simulation_years" ON simulation_years FOR DELETE USING (true);

CREATE POLICY "Allow public read access to simulation_responses" ON simulation_responses FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to simulation_responses" ON simulation_responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to simulation_responses" ON simulation_responses FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to simulation_responses" ON simulation_responses FOR DELETE USING (true);

CREATE POLICY "Allow public read access to simulation_coalitions" ON simulation_coalitions FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to simulation_coalitions" ON simulation_coalitions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to simulation_coalitions" ON simulation_coalitions FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to simulation_coalitions" ON simulation_coalitions FOR DELETE USING (true);

CREATE POLICY "Allow public read access to simulation_coalition_members" ON simulation_coalition_members FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to simulation_coalition_members" ON simulation_coalition_members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to simulation_coalition_members" ON simulation_coalition_members FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to simulation_coalition_members" ON simulation_coalition_members FOR DELETE USING (true);

CREATE POLICY "Allow public read access to simulation_relationship_changes" ON simulation_relationship_changes FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to simulation_relationship_changes" ON simulation_relationship_changes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to simulation_relationship_changes" ON simulation_relationship_changes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to simulation_relationship_changes" ON simulation_relationship_changes FOR DELETE USING (true);

CREATE POLICY "Allow public read access to simulation_outcomes" ON simulation_outcomes FOR SELECT USING (true);
CREATE POLICY "Allow public insert access to simulation_outcomes" ON simulation_outcomes FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update access to simulation_outcomes" ON simulation_outcomes FOR UPDATE USING (true);
CREATE POLICY "Allow public delete access to simulation_outcomes" ON simulation_outcomes FOR DELETE USING (true);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_simulations_community ON simulations(community_id);
CREATE INDEX IF NOT EXISTS idx_simulations_status ON simulations(status);
CREATE INDEX IF NOT EXISTS idx_simulation_years_simulation ON simulation_years(simulation_id);
CREATE INDEX IF NOT EXISTS idx_simulation_responses_year ON simulation_responses(simulation_year_id);
CREATE INDEX IF NOT EXISTS idx_simulation_responses_entity ON simulation_responses(entity_id);
CREATE INDEX IF NOT EXISTS idx_simulation_coalitions_simulation ON simulation_coalitions(simulation_id);
CREATE INDEX IF NOT EXISTS idx_simulation_relationship_changes_year ON simulation_relationship_changes(simulation_year_id);
CREATE INDEX IF NOT EXISTS idx_simulation_outcomes_simulation ON simulation_outcomes(simulation_id);
