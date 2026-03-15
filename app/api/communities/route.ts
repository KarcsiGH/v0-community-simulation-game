import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import type { Community } from "@/lib/entity-types"

// GET all communities
export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data, error } = await supabase
      .from("communities")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const communities: Community[] = data.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description,
      geography: Array.isArray(row.geography) ? row.geography.join(", ") : row.geography || "",
      issueAreas: row.issue_areas || [],
      criteria: row.custom_criteria ? JSON.stringify(row.custom_criteria) : undefined,
      focalEntityId: row.focal_entity_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))

    return NextResponse.json(communities)
  } catch (error) {
    console.error("Error fetching communities:", error)
    return NextResponse.json({ error: "Failed to fetch communities" }, { status: 500 })
  }
}

// POST create new community
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const dbCommunity = {
      name: body.name,
      description: body.description,
      geography: body.geography ? [body.geography] : [], // DB expects array
      issue_areas: body.issueAreas || [],
      custom_criteria: body.criteria ? { text: body.criteria } : null,
      focal_entity_id: body.focalEntityId || null,
    }

    const { data, error } = await supabase
      .from("communities")
      .insert(dbCommunity)
      .select()
      .maybeSingle()

    if (error) {
      console.error("Supabase insert error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: "Failed to create community" }, { status: 500 })
    }

    const community: Community = {
      id: data.id,
      name: data.name,
      description: data.description,
      geography: Array.isArray(data.geography) ? data.geography.join(", ") : data.geography || "",
      issueAreas: data.issue_areas || [],
      criteria: data.custom_criteria?.text || undefined,
      focalEntityId: data.focal_entity_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    }

    return NextResponse.json(community)
  } catch (error) {
    console.error("Error creating community:", error)
    return NextResponse.json({ error: "Failed to create community" }, { status: 500 })
  }
}
