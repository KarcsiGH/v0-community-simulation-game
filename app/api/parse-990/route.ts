import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File

    console.log("[v0] Parsing 990 form:", file.name)

    // TODO: Implement actual 990 parsing
    // For now, return mock data

    await new Promise((resolve) => setTimeout(resolve, 2000))

    const mockData = {
      annualRevenue: 2500000,
      annualExpenses: 2300000,
      programExpensePercent: 78,
      adminExpensePercent: 15,
      fundraisingExpensePercent: 7,
      staffCount: 25,
      boardSize: 12,
      assets: 1500000,
    }

    return NextResponse.json(mockData)
  } catch (error) {
    console.error("[v0] Error in parse-990:", error)
    return NextResponse.json({ error: "Failed to parse 990 form" }, { status: 500 })
  }
}
