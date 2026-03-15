import { type NextRequest, NextResponse } from "next/server"

// Note: Charity Navigator uses a GraphQL API that requires an API key
// For now, we'll use their public-facing search endpoint
// Users can add CHARITY_NAVIGATOR_API_KEY for full access

export async function POST(request: NextRequest) {
  try {
    const { organizationName, ein } = await request.json()

    if (!organizationName && !ein) {
      return NextResponse.json({ error: "Organization name or EIN is required" }, { status: 400 })
    }

    // Try to search by EIN first if available (more accurate)
    let searchQuery = ein || organizationName

    // Use the public Charity Navigator search
    // Note: Full API access requires registration at charitynavigator.org
    const searchUrl = `https://www.charitynavigator.org/api/v2/Organizations?app_id=public&app_key=public&search=${encodeURIComponent(searchQuery)}&rated=true&pageSize=5`

    try {
      const searchResponse = await fetch(searchUrl, {
        headers: {
          "Accept": "application/json",
          "User-Agent": "CommunitySimBot/1.0",
        },
      })

      // If the public API doesn't work, try alternative approach
      if (!searchResponse.ok) {
        // Fall back to scraping the public profile if we have an EIN
        if (ein) {
          const profileData = await fetchCharityNavigatorProfile(ein)
          if (profileData) {
            return NextResponse.json(profileData)
          }
        }
        
        return NextResponse.json({
          found: false,
          message: "Charity Navigator search unavailable. Consider adding CHARITY_NAVIGATOR_API_KEY for full access.",
        })
      }

      const data = await searchResponse.json()

      if (!data || data.length === 0) {
        return NextResponse.json({
          found: false,
          message: "Organization not found in Charity Navigator",
        })
      }

      // Find best match
      const orgNameLower = organizationName?.toLowerCase() || ""
      let bestMatch = data[0]
      for (const org of data) {
        if (org.ein === ein || org.charityName?.toLowerCase() === orgNameLower) {
          bestMatch = org
          break
        }
      }

      return NextResponse.json({
        found: true,
        source: "Charity Navigator",
        ein: bestMatch.ein,
        name: bestMatch.charityName,
        category: bestMatch.category?.categoryName,
        cause: bestMatch.cause?.causeName,
        rating: {
          overall: bestMatch.currentRating?.rating,
          score: bestMatch.currentRating?.score,
          ratingImage: bestMatch.currentRating?.ratingImage?.small,
        },
        financials: {
          totalRevenue: bestMatch.currentRating?.financialRating?.totalRevenue,
          totalExpenses: bestMatch.currentRating?.financialRating?.totalExpenses,
          programExpenseRatio: bestMatch.currentRating?.financialRating?.programExpenseRatio,
          administrativeExpenseRatio: bestMatch.currentRating?.financialRating?.adminExpenseRatio,
          fundraisingExpenseRatio: bestMatch.currentRating?.financialRating?.fundExpenseRatio,
        },
        accountability: {
          score: bestMatch.currentRating?.accountabilityRating?.score,
          boardMembersList: bestMatch.currentRating?.accountabilityRating?.boardMembersList,
          independentVotingBoardMembers: bestMatch.currentRating?.accountabilityRating?.independentVotingBoardMembers,
        },
        mission: bestMatch.mission,
        tagLine: bestMatch.tagLine,
        website: bestMatch.websiteURL,
        address: bestMatch.mailingAddress ? {
          street: bestMatch.mailingAddress.streetAddress1,
          city: bestMatch.mailingAddress.city,
          state: bestMatch.mailingAddress.stateOrProvince,
          zip: bestMatch.mailingAddress.postalCode,
        } : null,
        irsClassification: bestMatch.irsClassification?.classification,
        profileUrl: `https://www.charitynavigator.org/ein/${bestMatch.ein}`,
      })

    } catch (fetchError) {
      console.error("Charity Navigator fetch error:", fetchError)
      
      // Try alternative profile fetch
      if (ein) {
        const profileData = await fetchCharityNavigatorProfile(ein)
        if (profileData) {
          return NextResponse.json(profileData)
        }
      }

      return NextResponse.json({
        found: false,
        message: "Could not connect to Charity Navigator",
      })
    }

  } catch (error) {
    console.error("Charity Navigator API error:", error)
    return NextResponse.json({
      found: false,
      error: "Failed to search Charity Navigator",
    }, { status: 500 })
  }
}

// Fallback: Fetch public profile page and extract data
async function fetchCharityNavigatorProfile(ein: string): Promise<any | null> {
  try {
    const profileUrl = `https://www.charitynavigator.org/ein/${ein.replace(/-/g, '')}`
    const response = await fetch(profileUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html",
      },
    })

    if (!response.ok) return null

    const html = await response.text()

    // Extract basic info from the page
    const data: any = {
      found: true,
      source: "Charity Navigator Profile",
      ein,
      profileUrl,
    }

    // Extract organization name
    const nameMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/)
    if (nameMatch) data.name = nameMatch[1].trim()

    // Extract rating (look for star rating)
    const ratingMatch = html.match(/(\d+(?:\.\d+)?)\s*out of\s*4\s*stars?/i)
    if (ratingMatch) data.rating = { overall: parseFloat(ratingMatch[1]) }

    // Extract mission
    const missionMatch = html.match(/mission["\s:]+([^"<]{20,500})/i)
    if (missionMatch) data.mission = missionMatch[1].trim()

    return data

  } catch (error) {
    console.error("Error fetching Charity Navigator profile:", error)
    return null
  }
}
