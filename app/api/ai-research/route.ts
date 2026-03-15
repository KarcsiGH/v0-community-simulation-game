import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { organizationName, type, website, location } = await request.json()

    console.log("[v0] Starting AI-powered deep research for:", organizationName)

    // Run parallel research using multiple AI providers
    const [perplexityData, claudeData, openaiData] = await Promise.allSettled([
      researchWithPerplexity(organizationName, type, location),
      researchWithClaude(organizationName, type, website),
      researchWithOpenAI(organizationName, type, location),
    ])

    // Merge results from all sources
    const mergedData = mergeAIResearch(perplexityData, claudeData, openaiData)

    return NextResponse.json({
      success: true,
      data: mergedData,
      sources: {
        perplexity: perplexityData.status === "fulfilled",
        claude: claudeData.status === "fulfilled",
        openai: openaiData.status === "fulfilled",
      },
    })
  } catch (error) {
    console.error("[v0] AI research error:", error)
    return NextResponse.json({ success: false, error: "AI research failed" }, { status: 500 })
  }
}

// Track whether Perplexity key is known to be invalid so we don't keep retrying
let perplexityKeyInvalid = false

// Perplexity - Best for recent, factual information with citations
async function researchWithPerplexity(name: string, type: string, location?: string) {
  const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY

  if (!PERPLEXITY_API_KEY || perplexityKeyInvalid) {
    console.log("[v0] Perplexity skipped -", !PERPLEXITY_API_KEY ? "no API key" : "key previously failed auth")
    return null
  }

  const prompt = `Research the following organization and provide structured data:
Organization: ${name}
Type: ${type}
Location: ${location || "Unknown"}

Please provide the following information as JSON:
{
  "mission": "Organization's mission statement",
  "foundedDate": "Year or date founded (e.g., '1995' or '2000-03-15')",
  "legalStructure": "Legal structure (e.g., '501(c)(3) nonprofit', 'Private Foundation', 'LLC', 'Government Agency')",
  "programs": [{"name": "Program name", "description": "Brief description"}],
  "leadership": [{"name": "Person name", "role": "Title/role"}],
  "recentNews": ["Recent news items from last 2 years"],
  "communityImpact": "Description of community impact and reputation",
  "partnerships": ["Key partners and collaborators"],
  "strategicFocus": ["Strategic focus areas"],
  "annualRevenue": "Annual budget/revenue if publicly known (number or null)",
  "serviceArea": "Geographic service area",
  "values": ["Core values"],
  "targetPopulations": ["Populations served"]
}

Return ONLY valid JSON, no explanatory text.`

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        model: "sonar-pro",
        messages: [
          {
            role: "system",
            content:
              "You are a research assistant that provides accurate, factual information about organizations. Return your response as valid JSON only, no markdown or explanatory text.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        return_citations: true,
      }),
    })

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        console.log("[v0] Perplexity API key is invalid (status", response.status, ") - disabling for this session")
        perplexityKeyInvalid = true
      } else {
        console.error("[v0] Perplexity API error:", response.status)
      }
      return null
    }

    const data = await response.json()
    
    if (!data.choices?.[0]?.message?.content) {
      console.error("[v0] Perplexity returned unexpected structure:", JSON.stringify(data).slice(0, 500))
      return null
    }
    
    console.log("[v0] Perplexity research complete")

    return {
      content: data.choices[0].message.content,
      citations: data.citations || [],
      provider: "perplexity",
    }
  } catch (error) {
    console.error("[v0] Perplexity error:", error)
    return null
  }
}

// Claude - Best for deep analysis and nuanced understanding
async function researchWithClaude(name: string, type: string, website?: string) {
  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

  if (!ANTHROPIC_API_KEY) {
    console.log("[v0] Anthropic API key not found, skipping Claude research")
    return null
  }

  const prompt = `Analyze this organization in depth for a community simulation:
Organization: ${name}
Type: ${type}
Website: ${website || "Not provided"}

Provide detailed analysis as JSON:
{
  "organizational_culture": {"description": "...", "confidence": 0-100},
  "decision_making_style": {"style": "hierarchical|consensus-driven|collaborative|autocratic", "description": "...", "confidence": 0-100},
  "risk_tolerance": {"level": "low|moderate|high", "description": "...", "confidence": 0-100},
  "collaboration_willingness": {"level": "low|moderate|high", "description": "...", "confidence": 0-100},
  "innovation_orientation": {"level": "conservative|moderate|innovative", "confidence": 0-100},
  "influence_level": {"score": 1-10, "description": "...", "confidence": 0-100},
  "strategic_orientation": {"timeframe": "short-term|balanced|long-term", "confidence": 0-100},
  "behavioral_patterns": ["pattern1", "pattern2"],
  "trigger_conditions": ["condition1", "condition2"],
  "stakeholder_balance": "description of how they balance interests"
}

Return ONLY valid JSON.`

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      console.log("[v0] Claude API error:", response.status, "- skipping")
      return null
    }

    const data = await response.json()

    if (!data.content?.[0]?.text) {
      console.log("[v0] Claude returned unexpected response format, skipping")
      return null
    }

    console.log("[v0] Claude research complete")
    return {
      content: data.content[0].text,
      provider: "claude",
    }
  } catch (error) {
    console.log("[v0] Claude error, skipping:", (error as Error).message)
    return null
  }
}

// OpenAI - Best for structured data extraction and synthesis
async function researchWithOpenAI(name: string, type: string, location?: string) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY

  if (!OPENAI_API_KEY) {
    console.log("[v0] OpenAI API key not found, skipping")
    return null
  }

  const prompt = `Extract and synthesize information about this organization:
Organization: ${name}
Type: ${type}
Location: ${location || "Unknown"}

Return as JSON with the following structure:
{
  "foundedDate": "Year or date founded if known (e.g., '1995')",
  "legalStructure": "Legal structure if known (e.g., '501(c)(3)', 'Private Foundation')",
  "programs": [{"name": "Program name", "description": "Description", "targetPopulation": "Who it serves"}],
  "targetPopulations": ["Populations served"],
  "leadership": [{"name": "Person name", "role": "Title"}],
  "financialSize": "small/medium/large with estimated revenue range if known",
  "geographicScope": "local/regional/statewide/national",
  "fundingSources": ["Main funders or revenue sources"],
  "policyPositions": "Policy positions or advocacy work",
  "communityPerception": "How the organization is perceived",
  "foundingStory": "Historical context and founding story",
  "notableAchievements": ["Notable achievements"],
  "confidence": 0-100
}

Return ONLY valid JSON.`

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "You are a research analyst providing structured information about organizations. Be honest about confidence levels. Return valid JSON only.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.2,
        response_format: { type: "json_object" },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[v0] OpenAI API error:", response.status, errorText)
      return null
    }

    const data = await response.json()
    
    if (!data.choices?.[0]?.message?.content) {
      console.error("[v0] OpenAI returned unexpected structure:", JSON.stringify(data).slice(0, 500))
      return null
    }
    
    console.log("[v0] OpenAI research complete")

    return {
      content: data.choices[0].message.content,
      provider: "openai",
    }
  } catch (error) {
    console.error("[v0] OpenAI error:", error)
    return null
  }
}

// Helper function to safely extract JSON from a response that may contain markdown or other text
function extractJSON(content: string, provider?: string): Record<string, unknown> | null {
  if (!content) {
    console.log(`[v0] extractJSON (${provider}): No content provided`)
    return null
  }
  
  // Clean up common issues before parsing
  let cleaned = content.trim()
  
  // Remove BOM and other invisible characters
  cleaned = cleaned.replace(/^\uFEFF/, '')
  
  // Try 1: Parse directly (if content is pure JSON)
  try {
    const parsed = JSON.parse(cleaned)
    console.log(`[v0] extractJSON (${provider}): Direct parse succeeded`)
    return parsed
  } catch {
    // Continue to extraction methods
  }

  // Try 2: Look for JSON code block (```json ... ```)
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (codeBlockMatch) {
    try {
      const parsed = JSON.parse(codeBlockMatch[1].trim())
      console.log(`[v0] extractJSON (${provider}): Code block parse succeeded`)
      return parsed
    } catch {
      // Continue
    }
  }

  // Try 3: Find the first { and last } to extract the JSON object
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = cleaned.slice(firstBrace, lastBrace + 1)
    try {
      const parsed = JSON.parse(candidate)
      console.log(`[v0] extractJSON (${provider}): First/last brace parse succeeded`)
      return parsed
    } catch {
      // Continue to balanced brace method
    }
  }

  // Try 4: Find balanced braces - iterate through possible JSON objects
  let depth = 0
  let start = -1
  
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === '{') {
      if (depth === 0) start = i
      depth++
    } else if (cleaned[i] === '}') {
      depth--
      if (depth === 0 && start !== -1) {
        const candidate = cleaned.slice(start, i + 1)
        try {
          const parsed = JSON.parse(candidate)
          console.log(`[v0] extractJSON (${provider}): Balanced brace parse succeeded`)
          return parsed
        } catch {
          // Try next potential JSON object
          start = -1
        }
      }
    }
  }

  // Try 5: Return empty object rather than failing - allows partial data to still work
  console.log(`[v0] extractJSON (${provider}): All parsing methods failed, returning null. Content preview:`, cleaned.slice(0, 200))
  return null
}

// Merge and synthesize results from multiple AI providers
function mergeAIResearch(
  perplexity: PromiseSettledResult<any>,
  claude: PromiseSettledResult<any>,
  openai: PromiseSettledResult<any>,
) {
  const results = {
    perplexity: perplexity.status === "fulfilled" ? perplexity.value : null,
    claude: claude.status === "fulfilled" ? claude.value : null,
    openai: openai.status === "fulfilled" ? openai.value : null,
  }

  // Parse JSON responses using robust extraction
  const perplexityParsed = extractJSON(results.perplexity?.content, "perplexity")
  const claudeParsed = extractJSON(results.claude?.content, "claude")
  const openaiParsed = extractJSON(results.openai?.content, "openai")

  // Merge data with priority: Perplexity (most recent) > OpenAI (backup) > Claude (when enabled)
  return {
    // Basic Identity
    mission: perplexityParsed?.mission || openaiParsed?.mission || claudeParsed?.mission,
    foundedDate: perplexityParsed?.foundedDate || openaiParsed?.foundedDate || claudeParsed?.foundedDate,
    legalStructure: perplexityParsed?.legalStructure || openaiParsed?.legalStructure || claudeParsed?.legalStructure,
    
    // Programs & Services
    programs: perplexityParsed?.programs || openaiParsed?.programs || [],
    targetPopulations: perplexityParsed?.targetPopulations || openaiParsed?.targetPopulations || [],
    geographicServiceArea: openaiParsed?.geographicScope || perplexityParsed?.serviceArea,
    
    // Leadership
    keyLeadership: perplexityParsed?.leadership || openaiParsed?.leadership || [],
    
    // Strategic & Cultural
    strategicGoals: perplexityParsed?.strategicFocus || claudeParsed?.strategic_orientation || [],
    coreValues: perplexityParsed?.values || [],
    organizationalCulture: claudeParsed?.organizational_culture || perplexityParsed?.culture,
    decisionMakingStyle: claudeParsed?.decision_making_style || "data-driven",
    riskTolerance: claudeParsed?.risk_tolerance || "moderate",
    collaborationWillingness: claudeParsed?.collaboration_willingness || "moderate",
    communityInfluenceLevel: claudeParsed?.influence_level || 5,
    
    // Context
    recentNews: perplexityParsed?.recentNews || [],
    partnerships: perplexityParsed?.partnerships || [],
    communityPerception: openaiParsed?.communityPerception,
    foundingStory: openaiParsed?.foundingStory,
    
    // Financial
    annualRevenue: perplexityParsed?.annualRevenue || openaiParsed?.annualRevenue,
    primaryFundingSources: openaiParsed?.fundingSources || [],
    
    dataSources: [
      ...(results.perplexity?.citations || []),
      {
        type: "ai-research",
        providers: [
          results.perplexity ? "Perplexity" : null,
          results.claude ? "Claude" : null,
          results.openai ? "OpenAI" : null,
        ].filter(Boolean),
        date: new Date().toISOString(),
        confidence: 70,
      },
    ],
  }
}
