import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { organizationName } = await request.json()

    console.log("[v0] Searching for 990 data:", organizationName)

    // Search ProPublica Nonprofit Explorer API
    // ProPublica returns 404 with valid JSON body when no results found,
    // so we parse the body regardless of status to avoid noisy fetch errors.
    let searchData: { organizations?: Array<Record<string, unknown>> } = { organizations: [] }

    try {
      const searchUrl = `https://projects.propublica.org/nonprofits/api/v2/search.json?q=${encodeURIComponent(organizationName)}`
      const searchResponse = await fetch(searchUrl)
      const text = await searchResponse.text()
      searchData = JSON.parse(text)
    } catch {
      // JSON parse failure or network error - try shorter name
    }

    // If no results, try a shorter/simplified version of the name
    if (!searchData.organizations || searchData.organizations.length === 0) {
      const simplifiedName = organizationName
        .replace(/\b(of|the|and|for|in|at|by|to|&)\b/gi, " ")
        .replace(/[^a-zA-Z0-9\s]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .slice(0, 4)
        .join(" ")

      if (simplifiedName !== organizationName && simplifiedName.length > 3) {
        console.log("[v0] Retrying 990 search with simplified name:", simplifiedName)
        try {
          const retryUrl = `https://projects.propublica.org/nonprofits/api/v2/search.json?q=${encodeURIComponent(simplifiedName)}`
          const retryResponse = await fetch(retryUrl)
          const retryText = await retryResponse.text()
          const retryData = JSON.parse(retryText)
          if (retryData.organizations?.length > 0) {
            searchData = retryData
          }
        } catch {
          // Retry also failed
        }
      }
    }

    if (!searchData.organizations || searchData.organizations.length === 0) {
      return NextResponse.json({
        found: false,
        message: "No 990 data found for this organization",
      })
    }

    // Get the first matching organization
    const org = searchData.organizations[0]
    console.log("[v0] Found organization:", org.name, "EIN:", org.ein)

    // Fetch detailed organization data including filings
    let orgData: Record<string, unknown> = {}
    try {
      const orgUrl = `https://projects.propublica.org/nonprofits/api/v2/organizations/${org.ein}.json`
      const orgResponse = await fetch(orgUrl)
      const orgText = await orgResponse.text()
      orgData = JSON.parse(orgText)
    } catch {
      return NextResponse.json({
        found: false,
        message: "Organization found but could not retrieve detailed data",
        organizationName: org.name,
        ein: org.strein,
      })
    }

    // Get the most recent filing with data
    const latestFiling =
      orgData.filings_with_data && orgData.filings_with_data.length > 0 ? orgData.filings_with_data[0] : null

    if (!latestFiling) {
      return NextResponse.json({
        found: false,
        message: "Organization found but no recent 990 filings available",
        organizationName: org.name,
        ein: org.strein,
      })
    }

    // Extract financial data from the filing
    const data = {
      found: true,
      organizationName: org.name,
      ein: org.strein,
      address: org.address,
      city: org.city,
      state: org.state,
      zipcode: org.zipcode,
      taxYear: latestFiling.tax_prd_yr,
      annualRevenue: latestFiling.totrevenue || 0,
      annualExpenses: latestFiling.totfuncexpns || 0,
      assets: latestFiling.totassetsend || 0,
      liabilities: latestFiling.totliabend || 0,
      // Calculate expense percentages if available
      programExpensePercent:
        latestFiling.pct_compnsatncurrofcr !== undefined
          ? Math.round((1 - latestFiling.pct_compnsatncurrofcr) * 100)
          : null,
      // Add more fields as needed from the filing
      formType: latestFiling.formtype === 0 ? "990" : latestFiling.formtype === 1 ? "990-EZ" : "990-PF",
      pdfUrl: latestFiling.pdf_url,
    }

    console.log("[v0] Extracted 990 data:", data)

    return NextResponse.json(data)
  } catch (error) {
    console.error("[v0] Error searching 990 data:", error)
    return NextResponse.json({ error: "Failed to search for 990 data" }, { status: 500 })
  }
}
