-- Add branching support to simulations table
-- This allows creating alternate scenario branches from any point in a simulation

-- Add columns for tracking parent/child simulation relationships
ALTER TABLE simulations 
ADD COLUMN IF NOT EXISTS parent_simulation_id UUID REFERENCES simulations(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS branched_at_year INTEGER,
ADD COLUMN IF NOT EXISTS branch_description TEXT;

-- Create index for efficient branch queries
CREATE INDEX IF NOT EXISTS idx_simulations_parent ON simulations(parent_simulation_id);

-- Add a view to help query simulation trees
CREATE OR REPLACE VIEW simulation_branches AS
SELECT 
  s.id,
  s.name,
  s.scenario,
  s.status,
  s.current_year,
  s.total_years,
  s.parent_simulation_id,
  s.branched_at_year,
  s.branch_description,
  s.created_at,
  parent.name as parent_name,
  parent.scenario as parent_scenario
FROM simulations s
LEFT JOIN simulations parent ON s.parent_simulation_id = parent.id;
