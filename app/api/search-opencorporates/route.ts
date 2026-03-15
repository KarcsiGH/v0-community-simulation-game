import { type NextRequest, NextResponse } from "next/server"

// OpenCorporates API - Company registry data
// Free tier available with API key registration
// Docs: https://api.opencorporates.com/documentation/API-Reference

export async function POST(request: NextRequest) {
  try {
    const { companyName, jurisdictionCode } = await request.json()

    if (!companyName) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 })
    }

    const apiKey = process.env.OPENCORPORATES_API_KEY

    // Build search URL
    let searchUrl = `https://api.opencorporates.com/v0.4/companies/search?q=${encodeURIComponent(companyName)}&per_page=10&order=score`
    
    // Add jurisdiction filter if provided
    if (jurisdictionCode) {
      searchUrl += `&jurisdiction_code=${encodeURIComponent(jurisdictionCode)}`
    }

    // Add API key if available
    if (apiKey) {
      searchUrl += `&api_token=${apiKey}`
    }

    const searchResponse = await fetch(searchUrl, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "CommunitySimBot/1.0",
      },
    })

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text()
      console.error("OpenCorporates search error:", searchResponse.status, errorText)
      
      if (searchResponse.status === 401 || searchResponse.status === 403) {
        return NextResponse.json({
          found: false,
          message: "OpenCorporates API key required or rate limit exceeded",
        })
      }
      
      return NextResponse.json({
        found: false,
        message: "OpenCorporates search failed",
      })
    }

    const searchData = await searchResponse.json()
    const companies = searchData.results?.companies || []

    if (companies.length === 0) {
      return NextResponse.json({
        found: false,
        message: "Company not found in OpenCorporates",
      })
    }

    // Find best match
    const companyNameLower = companyName.toLowerCase()
    let bestMatch = companies[0].company
    for (const item of companies) {
      const company = item.company
      if (company.name?.toLowerCase() === companyNameLower) {
        bestMatch = company
        break
      }
    }

    // Get detailed company info if we have a good match
    let detailedInfo = null
    if (bestMatch.jurisdiction_code && bestMatch.company_number) {
      let detailUrl = `https://api.opencorporates.com/v0.4/companies/${bestMatch.jurisdiction_code}/${bestMatch.company_number}`
      if (apiKey) {
        detailUrl += `?api_token=${apiKey}`
      }

      try {
        const detailResponse = await fetch(detailUrl, {
          headers: {
            "Accept": "application/json",
            "User-Agent": "CommunitySimBot/1.0",
          },
        })

        if (detailResponse.ok) {
          const detailData = await detailResponse.json()
          detailedInfo = detailData.results?.company
        }
      } catch (e) {
        console.error("Error fetching company details:", e)
      }
    }

    const company = detailedInfo || bestMatch

    // Extract officers/leadership
    const leadership: { name: string; role: string }[] = []
    if (company.officers) {
      for (const officer of company.officers.slice(0, 10)) {
        const off = officer.officer
        if (off.name && !off.end_date) { // Only current officers
          leadership.push({
            name: off.name,
            role: off.position || "Officer",
          })
        }
      }
    }

    // Map to our format
    return NextResponse.json({
      found: true,
      source: "OpenCorporates",
      name: company.name,
      companyNumber: company.company_number,
      jurisdictionCode: company.jurisdiction_code,
      jurisdiction: mapJurisdiction(company.jurisdiction_code),
      companyType: company.company_type,
      currentStatus: company.current_status,
      incorporationDate: company.incorporation_date,
      dissolutionDate: company.dissolution_date,
      isActive: !company.inactive,
      registeredAddress: company.registered_address_in_full,
      registryUrl: company.registry_url,
      opencorporatesUrl: company.opencorporates_url,
      previousNames: company.previous_names?.map((pn: any) => ({
        name: pn.company_name,
        changedDate: pn.con_date,
      })) || [],
      keyLeadership: leadership,
      industryCodes: company.industry_codes?.map((ic: any) => ({
        code: ic.industry_code?.code,
        description: ic.industry_code?.description,
        scheme: ic.industry_code?.code_scheme_name,
      })) || [],
      // Map to Entity fields
      foundedDate: company.incorporation_date,
      legalStructure: company.company_type,
      headquarters: company.registered_address_in_full,
    })

  } catch (error) {
    console.error("OpenCorporates API error:", error)
    return NextResponse.json({
      found: false,
      error: "Failed to search OpenCorporates",
    }, { status: 500 })
  }
}

// Map jurisdiction codes to readable names
function mapJurisdiction(code: string): string {
  const jurisdictions: Record<string, string> = {
    us: "United States",
    us_de: "Delaware, USA",
    us_ca: "California, USA",
    us_ny: "New York, USA",
    us_tx: "Texas, USA",
    us_fl: "Florida, USA",
    us_mo: "Missouri, USA",
    gb: "United Kingdom",
    ca: "Canada",
    de: "Germany",
    fr: "France",
    au: "Australia",
  }
  
  return jurisdictions[code?.toLowerCase()] || code?.toUpperCase() || "Unknown"
}
