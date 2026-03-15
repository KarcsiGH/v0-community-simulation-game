-- Create communities table for grouping entities
-- Communities define a set of actors for simulation (e.g., "Childhood Obesity Prevention in Missouri")

CREATE TABLE IF NOT EXISTS communities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Basic Identity
  name TEXT NOT NULL,
  description TEXT,
  
  -- Definition Criteria
  geography TEXT[], -- Array of geographic areas (e.g., ["Missouri", "St. Louis"])
  issue_areas TEXT[], -- Array of issue areas (e.g., ["childhood obesity", "nutrition", "public health"])
  custom_criteria JSONB DEFAULT '{}'::jsonb, -- User-defined criteria
  
  -- Focal Organization (optional - the org doing strategic planning)
  focal_entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
  
  -- Discovery Metadata
  last_discovery_run TIMESTAMPTZ,
  discovery_settings JSONB DEFAULT '{}'::jsonb
);

-- Create join table for many-to-many relationship between communities and entities
CREATE TABLE IF NOT EXISTS community_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  
  -- How the entity relates to this community
  stakeholder_role TEXT, -- ally, funder, opposition, regulator, influencer, affected-party
  reason_for_inclusion TEXT, -- Why this entity was included
  
  -- Source of assignment
  assignment_source TEXT DEFAULT 'manual', -- manual, discovered, imported
  discovery_confidence INTEGER, -- 0-100 if discovered
  
  -- User review status
  reviewed BOOLEAN DEFAULT FALSE,
  review_date TIMESTAMPTZ,
  
  -- Ensure no duplicate assignments
  UNIQUE(community_id, entity_id)
);

-- Create candidates table for discovered but not yet confirmed entities
CREATE TABLE IF NOT EXISTS community_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  community_id UUID NOT NULL REFERENCES communities(id) ON DELETE CASCADE,
  
  -- Candidate info (may not exist as entity yet)
  candidate_name TEXT NOT NULL,
  candidate_type TEXT, -- nonprofit, for-profit, government, foundation, etc.
  
  -- Discovery metadata
  reason_for_inclusion TEXT NOT NULL, -- Why AI selected them
  stakeholder_role TEXT, -- ally, funder, opposition, regulator, influencer, affected-party
  confidence INTEGER DEFAULT 50, -- 0-100
  
  -- Link to existing entity if found
  existing_entity_id UUID REFERENCES entities(id) ON DELETE SET NULL,
  
  -- User decision
  status TEXT DEFAULT 'pending', -- pending, selected, rejected
  reviewed_at TIMESTAMPTZ,
  
  -- Prevent duplicate candidates per community
  UNIQUE(community_id, candidate_name)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_communities_name ON communities(name);
CREATE INDEX IF NOT EXISTS idx_community_entities_community ON community_entities(community_id);
CREATE INDEX IF NOT EXISTS idx_community_entities_entity ON community_entities(entity_id);
CREATE INDEX IF NOT EXISTS idx_community_candidates_community ON community_candidates(community_id);
CREATE INDEX IF NOT EXISTS idx_community_candidates_status ON community_candidates(status);

-- Enable Row Level Security
ALTER TABLE communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_candidates ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no auth required for now)
CREATE POLICY "Allow public read access to communities" ON communities
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to communities" ON communities
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to communities" ON communities
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to communities" ON communities
  FOR DELETE USING (true);

CREATE POLICY "Allow public read access to community_entities" ON community_entities
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to community_entities" ON community_entities
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to community_entities" ON community_entities
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to community_entities" ON community_entities
  FOR DELETE USING (true);

CREATE POLICY "Allow public read access to community_candidates" ON community_candidates
  FOR SELECT USING (true);

CREATE POLICY "Allow public insert access to community_candidates" ON community_candidates
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to community_candidates" ON community_candidates
  FOR UPDATE USING (true);

CREATE POLICY "Allow public delete access to community_candidates" ON community_candidates
  FOR DELETE USING (true);
