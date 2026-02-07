import { NextResponse } from "next/server";
import { AGENTS } from "@/lib/agents";

export async function GET() {
  // Simulate network delay if needed, but for now just return data
  const agentsList = Object.values(AGENTS);
  return NextResponse.json(agentsList);
}
