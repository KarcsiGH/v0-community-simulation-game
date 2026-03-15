import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { organizationName } = await request.json()

    if (!organizationName) {
      return NextResponse.json({ error: "Organization name is required" }, { status: 400 })
    }

    // Wikipedia API requires a proper User-Agent header per their policy
    // https://www.mediawiki.org/wiki/API:Etiquette
    // Format: clientname/version (contact URL or email) framework/version
    const headers = {
      "User-Agent": "CommunitySimApp/1.0 (v0.dev automated data collection) Next.js/16",
      "Accept": "application/json",
      "Accept-Encoding": "gzip", // Recommended by Wikipedia for bandwidth
    }

    // Step 1: Search Wikipedia for the organization
    // Using maxlag=5 to be nice to Wikipedia servers (recommended for non-interactive requests)
    const searchUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(organizationName)}&limit=5&namespace=0&format=json&maxlag=5`
    
    const searchResponse = await fetch(searchUrl, { headers })
    if (!searchResponse.ok) {
      if (searchResponse.status === 429) {
        // Rate limited - return gracefully
        return NextResponse.json({ 
          found: false, 
          message: "Wikipedia rate limit reached - try again later" 
        })
      }
      return NextResponse.json({ found: false, message: "Wikipedia search failed" })
    }

    // Check for maxlag response (Wikipedia returns this as JSON when servers are busy)
    const searchText = await searchResponse.text()
    let searchData
    try {
      searchData = JSON.parse(searchText)
      if (searchData.error?.code === "maxlag") {
        return NextResponse.json({ 
          found: false, 
          message: "Wikipedia servers busy - try again later" 
        })
      }
    } catch {
      return NextResponse.json({ found: false, message: "Invalid response from Wikipedia" })
    }

    // OpenSearch format: [searchTerm, [titles], [descriptions], [urls]]
    const titles = searchData[1] || []
    const descriptions = searchData[2] || []
    const urls = searchData[3] || []

    if (titles.length === 0) {
      return NextResponse.json({ found: false, message: "No Wikipedia article found" })
    }

    // Find the best matching title
    const orgNameLower = organizationName.toLowerCase()
    let bestMatchIndex = 0
    for (let i = 0; i < titles.length; i++) {
      if (titles[i].toLowerCase().includes(orgNameLower) || 
          orgNameLower.includes(titles[i].toLowerCase())) {
        bestMatchIndex = i
        break
      }
    }

    const pageTitle = titles[bestMatchIndex]
    const pageUrl = urls[bestMatchIndex]

    // Step 2: Get the full page content with extracts
    // Adding maxlag=5 to be considerate of Wikipedia servers
    const contentUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=extracts|pageprops|revisions&exintro=false&explaintext=true&ppprop=wikibase_item&rvprop=content&rvslots=main&format=json&maxlag=5`
    
    const contentResponse = await fetch(contentUrl, { headers })
    if (!contentResponse.ok) {
      return NextResponse.json({ 
        found: true, 
        title: pageTitle,
        url: pageUrl,
        description: descriptions[bestMatchIndex],
        message: "Could not fetch full content"
      })
    }

    const contentData = await contentResponse.json()
    const pages = contentData.query?.pages || {}
    const pageId = Object.keys(pages)[0]
    const page = pages[pageId]

    if (!page || pageId === "-1") {
      return NextResponse.json({ found: false, message: "Wikipedia page not found" })
    }

    const extract = page.extract || ""
    const wikitext = page.revisions?.[0]?.slots?.main?.["*"] || ""

    // Step 3: Extract structured data from the content
    const extractedData = extractInfoboxData(wikitext, extract)

    return NextResponse.json({
      found: true,
      title: pageTitle,
      url: pageUrl,
      description: descriptions[bestMatchIndex],
      extract: extract.slice(0, 5000), // Limit extract size
      ...extractedData,
    })

  } catch (error) {
    console.error("Wikipedia API error:", error)
    return NextResponse.json({ 
      found: false, 
      error: "Failed to search Wikipedia" 
    }, { status: 500 })
  }
}

// Extract data from Wikipedia infobox and content
function extractInfoboxData(wikitext: string, extract: string) {
  const data: Record<string, any> = {}

  // Common infobox patterns for organizations
  const patterns = {
    // Founding date patterns
    foundedDate: [
      /\|\s*founded\s*=\s*\{\{[Ss]tart date\|(\d{4})\|?(\d{1,2})?\|?(\d{1,2})?\}\}/,
      /\|\s*founded\s*=\s*(\d{4})/,
      /\|\s*formation\s*=\s*(\d{4})/,
      /\|\s*established\s*=\s*(\d{4})/,
      /[Ff]ounded in (\d{4})/,
      /[Ee]stablished in (\d{4})/,
    ],
    // Type/legal structure patterns
    legalStructure: [
      /\|\s*type\s*=\s*\[\[([^\]|]+)/,
      /\|\s*type\s*=\s*([^\n|]+)/,
      /\|\s*tax_id\s*=.*?(501\(c\)\(\d+\))/i,
      /\|\s*status\s*=\s*([^\n|]+)/,
    ],
    // Headquarters
    headquarters: [
      /\|\s*headquarters\s*=\s*\[\[([^\]|]+)/,
      /\|\s*headquarters\s*=\s*([^\n|]+)/,
      /\|\s*location\s*=\s*\[\[([^\]|]+)/,
      /\|\s*location\s*=\s*([^\n|]+)/,
    ],
    // Key people / leadership
    keyPeople: [
      /\|\s*key_people\s*=\s*([^\n]+(?:\n\s*[^|][^\n]+)*)/,
      /\|\s*leader_name\s*=\s*([^\n|]+)/,
      /\|\s*president\s*=\s*([^\n|]+)/,
      /\|\s*ceo\s*=\s*([^\n|]+)/,
      /\|\s*chairman\s*=\s*([^\n|]+)/,
      /\|\s*director\s*=\s*([^\n|]+)/,
    ],
    // Revenue/budget
    revenue: [
      /\|\s*revenue\s*=\s*\{\{[Uu]S\$\|([0-9,.]+)\s*(million|billion)?\}\}/,
      /\|\s*revenue\s*=\s*\$?([0-9,.]+)\s*(million|billion)?/i,
      /\|\s*budget\s*=\s*\$?([0-9,.]+)\s*(million|billion)?/i,
      /\|\s*assets\s*=\s*\$?([0-9,.]+)\s*(million|billion)?/i,
    ],
    // Number of employees
    employees: [
      /\|\s*num_employees\s*=\s*([0-9,]+)/,
      /\|\s*employees\s*=\s*([0-9,]+)/,
      /\|\s*staff\s*=\s*([0-9,]+)/,
    ],
    // Website
    website: [
      /\|\s*website\s*=\s*\{\{[Uu]rl\|([^}]+)\}\}/,
      /\|\s*website\s*=\s*\[?(https?:\/\/[^\s\]|]+)/,
    ],
    // Focus/purpose
    focus: [
      /\|\s*focus\s*=\s*([^\n|]+)/,
      /\|\s*purpose\s*=\s*([^\n|]+)/,
      /\|\s*mission\s*=\s*([^\n|]+)/,
      /\|\s*area_served\s*=\s*([^\n|]+)/,
    ],
  }

  // Extract founded date
  for (const pattern of patterns.foundedDate) {
    const match = wikitext.match(pattern) || extract.match(pattern)
    if (match) {
      if (match[2] && match[3]) {
        data.foundedDate = `${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`
      } else {
        data.foundedDate = match[1]
      }
      break
    }
  }

  // Extract legal structure
  for (const pattern of patterns.legalStructure) {
    const match = wikitext.match(pattern)
    if (match) {
      data.legalStructure = cleanWikiText(match[1])
      break
    }
  }

  // Extract headquarters
  for (const pattern of patterns.headquarters) {
    const match = wikitext.match(pattern)
    if (match) {
      data.headquarters = cleanWikiText(match[1])
      break
    }
  }

  // Extract key people
  const leadership: { name: string; role: string }[] = []
  for (const pattern of patterns.keyPeople) {
    const match = wikitext.match(pattern)
    if (match) {
      const peopleText = match[1]
      // Parse key_people format: [[Name]] (Role)
      const personMatches = peopleText.matchAll(/\[\[([^\]|]+)(?:\|[^\]]+)?\]\]\s*(?:\(([^)]+)\))?/g)
      for (const personMatch of personMatches) {
        leadership.push({
          name: personMatch[1].trim(),
          role: personMatch[2]?.trim() || "Leadership"
        })
      }
      // Also try simple name patterns
      const simpleMatches = peopleText.matchAll(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g)
      for (const simpleMatch of simpleMatches) {
        if (!leadership.some(l => l.name === simpleMatch[1])) {
          leadership.push({ name: simpleMatch[1], role: "Leadership" })
        }
      }
      break
    }
  }
  if (leadership.length > 0) {
    data.keyLeadership = leadership.slice(0, 10) // Limit to 10
  }

  // Extract revenue
  for (const pattern of patterns.revenue) {
    const match = wikitext.match(pattern)
    if (match) {
      let amount = parseFloat(match[1].replace(/,/g, ''))
      const unit = match[2]?.toLowerCase()
      if (unit === 'billion') amount *= 1000000000
      else if (unit === 'million') amount *= 1000000
      data.annualRevenue = amount
      break
    }
  }

  // Extract employees
  for (const pattern of patterns.employees) {
    const match = wikitext.match(pattern)
    if (match) {
      data.staffCount = parseInt(match[1].replace(/,/g, ''), 10)
      break
    }
  }

  // Extract website
  for (const pattern of patterns.website) {
    const match = wikitext.match(pattern)
    if (match) {
      data.website = match[1].replace(/\s/g, '')
      break
    }
  }

  // Extract focus/purpose areas
  for (const pattern of patterns.focus) {
    const match = wikitext.match(pattern)
    if (match) {
      data.focusAreas = cleanWikiText(match[1])
      break
    }
  }

  return data
}

// Clean Wikipedia markup from text
function cleanWikiText(text: string): string {
  return text
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2') // [[Link|Text]] -> Text
    .replace(/\[\[([^\]]+)\]\]/g, '$1') // [[Link]] -> Link
    .replace(/\{\{[^}]+\}\}/g, '') // Remove templates
    .replace(/<[^>]+>/g, '') // Remove HTML tags
    .replace(/'''?/g, '') // Remove bold/italic
    .trim()
}
