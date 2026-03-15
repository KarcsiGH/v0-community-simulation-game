import { type NextRequest, NextResponse } from "next/server"

// USAspending.gov API for government spending data
// Documentation: https://api.usaspending.gov/docs/endpoints

export async function POST(request: NextRequest) {
  try {
    const { organizationName, entityType } = await request.json()

    if (!organizationName) {
      return NextResponse.json({ found: false, error: "Organization name required" })
    }

    // Step 1: Search for the recipient by name
    const searchResponse = await fetch(
      "https://api.usaspending.gov/api/v2/autocomplete/recipient/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          search_text: organizationName,
          limit: 10,
        }),
      }
    )

    if (!searchResponse.ok) {
      return NextResponse.json({ 
        found: false, 
        error: `USAspending search failed: ${searchResponse.status}` 
      })
    }

    const searchResults = await searchResponse.json()
    
    if (!searchResults.results || searchResults.results.length === 0) {
      // Entity not found as a federal award recipient
      return NextResponse.json({ 
        found: false, 
        message: "Organization not found in federal spending database" 
      })
    }

    // Find best match (first result or exact match)
    const searchName = organizationName.toLowerCase()
    let bestMatch = searchResults.results[0]
    
    for (const result of searchResults.results) {
      if (result.recipient_name?.toLowerCase() === searchName) {
        bestMatch = result
        break
      }
    }

    const recipientId = bestMatch.recipient_id

    // Step 2: Get detailed recipient information
    let recipientDetails = null
    if (recipientId) {
      try {
        const detailResponse = await fetch(
          `https://api.usaspending.gov/api/v2/recipient/${recipientId}/`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          }
        )

        if (detailResponse.ok) {
          recipientDetails = await detailResponse.json()
        }
      } catch (e) {
        console.error("[v0] Error fetching recipient details:", e)
      }
    }

    // Step 3: Search for awards received by this entity
    // Must make separate calls per award group (API requirement)
    const timeFilter = {
      start_date: `${new Date().getFullYear() - 5}-01-01`,
      end_date: `${new Date().getFullYear()}-12-31`,
    }
    
    const baseFields = [
      "Award ID",
      "Recipient Name",
      "Award Amount",
      "Total Outlays",
      "Description",
      "Award Type",
      "Awarding Agency",
      "Start Date",
      "End Date",
    ]

    // Use recipient awards endpoint instead - more reliable for recipient-based search
    let awardsData: any[] = []
    
    if (recipientId) {
      try {
        // Use the recipient's awards endpoint which is more reliable
        const awardsResponse = await fetch(
          `https://api.usaspending.gov/api/v2/recipient/${recipientId}/awards/`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              page: 1,
              limit: 20,
              sort: "total_transaction_obligated_amount",
              order: "desc",
            }),
          }
        )
        
        if (awardsResponse.ok) {
          awardsData = await awardsResponse.json()
        }
      } catch (e) {
        console.error("[v0] Error fetching recipient awards:", e)
      }
    }
    
    // Filter by award type
    const allAwards = awardsData
    const grantsResults = allAwards.filter((a: any) => 
      ["02", "03", "04", "05"].includes(a.award_type)
    )
    const contractsResults = allAwards.filter((a: any) => 
      ["A", "B", "C", "D"].includes(a.award_type)
    )

    // Step 4: Calculate summary statistics
    let totalObligations = 0
    let totalOutlays = 0
    const grantCount = grantsResults.length
    const contractCount = contractsResults.length
    const fundingAgencies: Set<string> = new Set()

    for (const award of allAwards) {
      // Recipient awards endpoint uses different field names
      totalObligations += award.total_transaction_obligated_amount || award.total_obligation || 0
      totalOutlays += award.total_outlays || 0
      
      if (award.awarding_toptier_agency_name) {
        fundingAgencies.add(award.awarding_toptier_agency_name)
      }
    }

    return NextResponse.json({
      found: true,
      recipientName: bestMatch.recipient_name,
      recipientId,
      uei: bestMatch.uei,
      duns: bestMatch.duns,
      recipientLevel: recipientDetails?.recipient_level,
      location: recipientDetails?.location ? {
        address: recipientDetails.location.address_line1,
        city: recipientDetails.location.city_name,
        state: recipientDetails.location.state_code,
        zip: recipientDetails.location.zip5,
        country: recipientDetails.location.country_name,
      } : null,
      businessTypes: recipientDetails?.business_types || [],
      summary: {
        totalObligations,
        totalOutlays,
        grantCount,
        contractCount,
        totalAwards: allAwards.length,
        fundingAgencies: Array.from(fundingAgencies),
        yearsOfData: 5,
      },
      recentAwards: allAwards.slice(0, 10).map((award: any) => ({
        awardId: award.generated_internal_id || award.award_id,
        amount: award.total_transaction_obligated_amount || award.total_obligation,
        description: award.description,
        type: award.award_type,
        agency: award.awarding_toptier_agency_name,
        startDate: award.period_of_performance_start_date,
        endDate: award.period_of_performance_current_end_date,
      })),
      profileUrl: recipientId 
        ? `https://www.usaspending.gov/recipient/${recipientId}/latest`
        : null,
    })
  } catch (error) {
    console.error("[v0] Error in search-usaspending:", error)
    return NextResponse.json({ found: false, error: "Failed to search USAspending database" })
  }
}
