import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: communityId } = await params
  const supabase = await createClient()

  try {
    const { data, error } = await supabase
      .from("community_entities")
      .select(`
        entity_id,
        stakeholder_role,
        reason_for_inclusion,
        entities (
          id,
          name,
          type,
          mission
        )
      `)
      .eq("community_id", communityId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error("Error fetching community entities:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch entities" },
      { status: 500 }
    )
  }
}
