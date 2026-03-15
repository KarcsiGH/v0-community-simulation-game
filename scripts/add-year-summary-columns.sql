-- Add enhanced summary columns to simulation_years table
-- These store the strategic analysis generated after each year

-- Opposition summary: what opposing/resistant entities did and their likely next moves
ALTER TABLE simulation_years
ADD COLUMN IF NOT EXISTS opposition_summary jsonb;

-- Landscape snapshot: current state of power dynamics, alliances, momentum
ALTER TABLE simulation_years
ADD COLUMN IF NOT EXISTS landscape_snapshot jsonb;

-- Strategic recommendations: actionable advice for focal org or coalition
ALTER TABLE simulation_years
ADD COLUMN IF NOT EXISTS recommendations jsonb;

-- Add comment for documentation
COMMENT ON COLUMN simulation_years.opposition_summary IS 'Summary of opposing entity actions and predicted moves';
COMMENT ON COLUMN simulation_years.landscape_snapshot IS 'Current state of power dynamics, alliances, resources, and momentum';
COMMENT ON COLUMN simulation_years.recommendations IS 'Strategic recommendations for the focal organization or coalition';
