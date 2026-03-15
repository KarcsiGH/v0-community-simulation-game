import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { url, organizationName, organizationType } = await request.json()

    if (!url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    // Step 1: Fetch homepage and discover relevant pages through link analysis
    let websiteContent = ""
    const baseUrl = new URL(url).origin
    
    // Helper to fetch page and return both raw HTML and cleaned text
    const fetchPage = async (pageUrl: string): Promise<{ html: string; text: string }> => {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 10000)
        
        const response = await fetch(pageUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Accept": "text/html,application/xhtml+xml",
          },
          signal: controller.signal,
        })
        
        clearTimeout(timeoutId)
        if (!response.ok) return { html: "", text: "" }
        
        const html = await response.text()
        const text = html
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
          .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
        return { html, text }
      } catch {
        return { html: "", text: "" }
      }
    }

    // Broad search terms organized by category
    const searchTerms = {
      // Leadership & People
      leadership: ["leadership", "leader", "executive", "ceo", "president", "director"],
      board: ["board", "trustee", "governor", "advisory"],
      staff: ["staff", "team", "people", "employee", "personnel", "who we are"],
      
      // Programs & Work
      programs: ["program", "service", "initiative", "project", "work"],
      funding: ["grant", "fund", "invest", "grantee", "award", "giving", "support"],
      impact: ["impact", "outcome", "result", "report", "annual", "achievement"],
      
      // About & Mission
      about: ["about", "mission", "vision", "value", "history", "story", "purpose"],
      focus: ["focus", "priority", "area", "issue", "cause", "community"],
      
      // Contact & Location
      contact: ["contact", "location", "office", "reach", "connect"],
    }

    // Fetch homepage first
    const homepage = await fetchPage(url)
    
    if (!homepage.html) {
      websiteContent = `Unable to fetch website content. Organization: ${organizationName || "Unknown"}`
    } else {
      // Extract all links from homepage
      const linkRegex = /<a[^>]+href=["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi
      const discoveredLinks: { url: string; text: string; category: string; score: number }[] = []
      let match
      
      while ((match = linkRegex.exec(homepage.html)) !== null) {
        const href = match[1].trim()
        const linkText = match[2]
          .replace(/<[^>]+>/g, " ") // Remove nested HTML tags
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase()
        const hrefLower = href.toLowerCase()
        
        // Skip external links, anchors, mailto, tel, javascript
        if (href.startsWith("mailto:") || href.startsWith("tel:") || 
            href.startsWith("javascript:") || href.startsWith("#")) {
          continue
        }
        
        // Normalize URL
        let fullUrl = href
        if (href.startsWith("/")) {
          fullUrl = baseUrl + href
        } else if (!href.startsWith("http")) {
          fullUrl = baseUrl + "/" + href
        }
        
        // Only include internal links
        if (!fullUrl.startsWith(baseUrl)) continue
        
        // Score the link based on matching terms
        let score = 0
        let matchedCategory = "other"
        
        for (const [category, terms] of Object.entries(searchTerms)) {
          for (const term of terms) {
            if (linkText.includes(term) || hrefLower.includes(term)) {
              score += 2
              matchedCategory = category
            }
          }
        }
        
        if (score > 0) {
          discoveredLinks.push({ 
            url: fullUrl, 
            text: linkText, 
            category: matchedCategory,
            score 
          })
        }
      }
      
      // Deduplicate by URL, keeping highest score
      const uniqueLinks = new Map<string, typeof discoveredLinks[0]>()
      for (const link of discoveredLinks) {
        const existing = uniqueLinks.get(link.url)
        if (!existing || link.score > existing.score) {
          uniqueLinks.set(link.url, link)
        }
      }
      
      // Sort by score and take top links from each category
      const sortedLinks = [...uniqueLinks.values()].sort((a, b) => b.score - a.score)
      
      // Ensure diversity - take top 2-3 from each category, up to 12 total pages
      const selectedLinks: typeof discoveredLinks[0][] = []
      const categoryCount: Record<string, number> = {}
      
      for (const link of sortedLinks) {
        const count = categoryCount[link.category] || 0
        if (count < 3 && selectedLinks.length < 12) {
          selectedLinks.push(link)
          categoryCount[link.category] = count + 1
        }
      }
      
      // Fetch all discovered pages in parallel
      const pageResults = await Promise.all(
        selectedLinks.map(async (link) => {
          const page = await fetchPage(link.url)
          return { 
            url: link.url, 
            category: link.category,
            text: page.text 
          }
        })
      )
      
      // Combine all content with category labels
      const allContent = [
        `[Homepage: ${url}]\n${homepage.text}`,
        ...pageResults
          .filter(p => p.text && p.text.length > 100) // Only include pages with substantial content
          .map(p => `[${p.category.toUpperCase()}: ${p.url}]\n${p.text}`)
      ]
      
      websiteContent = allContent.join("\n\n---\n\n").slice(0, 30000) // Increased limit
    }

    // Step 2: Use OpenAI to extract structured data
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY
    
    if (!OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: "OpenAI API key not configured",
        dataQualityScore: 0 
      }, { status: 500 })
    }

    const extractionPrompt = `Analyze the following website content for an organization${organizationName ? ` named "${organizationName}"` : ""}${organizationType ? ` (type: ${organizationType})` : ""}.

Extract the following information and return it as JSON. Only include fields where you find clear evidence in the content. Do not make up information.

Required JSON structure:
{
  "mission": "The organization's mission statement or purpose (exact text if found)",
  "foundedDate": "Year founded if mentioned (e.g., '1995' or '1995-03-15')",
  "legalStructure": "Legal structure if mentioned (e.g., '501(c)(3)', 'LLC', 'Government Agency')",
  "programs": [
    {
      "name": "Program name",
      "description": "Brief description",
      "targetPopulation": "Who the program serves"
    }
  ],
  "keyLeadership": [
    {
      "name": "Person's name",
      "role": "Their title/role"
    }
  ],
  "targetPopulations": ["List of populations served"],
  "geographicServiceArea": "Geographic area served",
  "coreValues": ["List of stated values"],
  "staffCount": number or null,
  "boardSize": number or null,
  "contactInfo": {
    "address": "Physical address if found",
    "phone": "Phone number if found",
    "email": "Email if found"
  },
  "dataQualityScore": 0-100 based on how much information was found
}

Website content:
${websiteContent}

Return ONLY valid JSON, no other text.`

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a data extraction assistant. Extract structured information from website content. Return only valid JSON. If information is not found, omit the field or use null. Never fabricate information.",
          },
          {
            role: "user",
            content: extractionPrompt,
          },
        ],
        temperature: 0.1,
        response_format: { type: "json_object" },
      }),
    })

    if (!openaiResponse.ok) {
      const errorBody = await openaiResponse.text()
      console.error("OpenAI API error:", errorBody)
      return NextResponse.json({ 
        error: "Failed to analyze website content",
        dataQualityScore: 0 
      }, { status: 500 })
    }

    const openaiData = await openaiResponse.json()
    const extractedContent = openaiData.choices?.[0]?.message?.content

    if (!extractedContent) {
      return NextResponse.json({ 
        error: "No data extracted",
        dataQualityScore: 0 
      }, { status: 500 })
    }

    // Parse the JSON response
    let extractedData
    try {
      extractedData = JSON.parse(extractedContent)
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", extractedContent)
      return NextResponse.json({ 
        error: "Failed to parse extracted data",
        dataQualityScore: 0 
      }, { status: 500 })
    }

    // Return the extracted data
    return NextResponse.json({
      ...extractedData,
      sourceUrl: url,
      extractedAt: new Date().toISOString(),
    })

  } catch (error) {
    console.error("Error in scrape-website:", error)
    return NextResponse.json({ 
      error: "Failed to scrape website",
      dataQualityScore: 0 
    }, { status: 500 })
  }
}
