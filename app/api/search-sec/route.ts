import { type NextRequest, NextResponse } from "next/server"

// SEC EDGAR API for publicly traded companies
// Documentation: https://www.sec.gov/search-filings/edgar-application-programming-interfaces

export async function POST(request: NextRequest) {
  try {
    const { companyName, ticker } = await request.json()

    if (!companyName && !ticker) {
      return NextResponse.json({ found: false, error: "Company name or ticker required" })
    }

    // Step 1: Search for the company's CIK (Central Index Key)
    // SEC provides a company ticker lookup endpoint
    let cik: string | null = null

    if (ticker) {
      // Try ticker lookup first (more precise)
      try {
        const tickerResponse = await fetch(
          "https://www.sec.gov/files/company_tickers.json",
          {
            headers: {
              "User-Agent": "CommunitySimulation contact@example.com",
              "Accept": "application/json",
            },
          }
        )

        if (tickerResponse.ok) {
          const tickerData = await tickerResponse.json()
          // tickerData is an object with numeric keys, each containing cik_str, ticker, title
          const companies = Object.values(tickerData) as Array<{
            cik_str: number
            ticker: string
            title: string
          }>
          
          const match = companies.find(
            (c) => c.ticker.toLowerCase() === ticker.toLowerCase()
          )
          
          if (match) {
            cik = String(match.cik_str).padStart(10, "0")
          }
        }
      } catch (e) {
        console.error("[v0] Error fetching SEC ticker data:", e)
      }
    }

    // If no CIK found via ticker, search by company name
    if (!cik && companyName) {
      try {
        const tickerResponse = await fetch(
          "https://www.sec.gov/files/company_tickers.json",
          {
            headers: {
              "User-Agent": "CommunitySimulation contact@example.com",
              "Accept": "application/json",
            },
          }
        )

        if (tickerResponse.ok) {
          const tickerData = await tickerResponse.json()
          const companies = Object.values(tickerData) as Array<{
            cik_str: number
            ticker: string
            title: string
          }>
          
          // Search by partial company name match
          const searchName = companyName.toLowerCase()
          const match = companies.find(
            (c) => c.title.toLowerCase().includes(searchName) ||
                   searchName.includes(c.title.toLowerCase())
          )
          
          if (match) {
            cik = String(match.cik_str).padStart(10, "0")
          }
        }
      } catch (e) {
        console.error("[v0] Error searching SEC by company name:", e)
      }
    }

    if (!cik) {
      return NextResponse.json({ 
        found: false, 
        message: "Company not found in SEC database (may be private company)" 
      })
    }

    // Step 2: Fetch company submissions data
    const submissionsResponse = await fetch(
      `https://data.sec.gov/submissions/CIK${cik}.json`,
      {
        headers: {
          "User-Agent": "CommunitySimulation contact@example.com",
          "Accept": "application/json",
        },
      }
    )

    if (!submissionsResponse.ok) {
      return NextResponse.json({ 
        found: false, 
        error: `Failed to fetch SEC data: ${submissionsResponse.status}` 
      })
    }

    const submissions = await submissionsResponse.json()

    // Step 3: Find the most recent 10-K filing
    const filings = submissions.filings?.recent
    let latest10K = null

    if (filings && filings.form) {
      for (let i = 0; i < filings.form.length; i++) {
        if (filings.form[i] === "10-K" || filings.form[i] === "10-K/A") {
          latest10K = {
            form: filings.form[i],
            filingDate: filings.filingDate[i],
            accessionNumber: filings.accessionNumber[i],
            primaryDocument: filings.primaryDocument[i],
          }
          break
        }
      }
    }

    // Step 4: Fetch XBRL financial data
    let financialData = null
    try {
      const factsResponse = await fetch(
        `https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`,
        {
          headers: {
            "User-Agent": "CommunitySimulation contact@example.com",
            "Accept": "application/json",
          },
        }
      )

      if (factsResponse.ok) {
        const facts = await factsResponse.json()
        
        // Extract key financial metrics from US-GAAP taxonomy
        const usGaap = facts.facts?.["us-gaap"] || {}
        
        // Helper to get most recent annual value
        const getLatestAnnualValue = (concept: any): number | null => {
          if (!concept?.units) return null
          const usdValues = concept.units.USD || concept.units.shares || []
          const annualValues = usdValues.filter((v: any) => 
            v.form === "10-K" || v.form === "10-K/A"
          )
          if (annualValues.length === 0) return null
          // Sort by end date descending and take most recent
          annualValues.sort((a: any, b: any) => 
            new Date(b.end).getTime() - new Date(a.end).getTime()
          )
          return annualValues[0]?.val || null
        }

        financialData = {
          revenues: getLatestAnnualValue(usGaap.Revenues) || 
                    getLatestAnnualValue(usGaap.RevenueFromContractWithCustomerExcludingAssessedTax) ||
                    getLatestAnnualValue(usGaap.SalesRevenueNet),
          netIncome: getLatestAnnualValue(usGaap.NetIncomeLoss),
          totalAssets: getLatestAnnualValue(usGaap.Assets),
          totalLiabilities: getLatestAnnualValue(usGaap.Liabilities),
          stockholdersEquity: getLatestAnnualValue(usGaap.StockholdersEquity),
          employees: getLatestAnnualValue(usGaap.EntityNumberOfEmployees),
        }
      }
    } catch (e) {
      console.error("[v0] Error fetching XBRL data:", e)
    }

    return NextResponse.json({
      found: true,
      cik,
      companyName: submissions.name,
      ticker: submissions.tickers?.[0] || ticker,
      sic: submissions.sic,
      sicDescription: submissions.sicDescription,
      stateOfIncorporation: submissions.stateOfIncorporation,
      fiscalYearEnd: submissions.fiscalYearEnd,
      exchanges: submissions.exchanges,
      website: submissions.website,
      formerNames: submissions.formerNames,
      latest10K,
      financialData,
      filingUrl: latest10K 
        ? `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=10-K`
        : null,
    })

  } catch (error) {
    console.error("[v0] Error in search-sec:", error)
    return NextResponse.json({ found: false, error: "Failed to search SEC database" })
  }
}
