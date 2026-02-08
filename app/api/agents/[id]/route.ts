import { NextResponse } from "next/server";
import { AGENTS } from "@/lib/agents";
import { getAgent } from "@/lib/agent-utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Check static agents first
  let agent = AGENTS[id];

  // If not found, check local agents
  if (!agent) {
    const localAgent = await getAgent(id);
    if (localAgent) {
      agent = localAgent;
    }
  }

  if (!agent) {
    return new NextResponse("Agent not found", { status: 404 });
  }

  return NextResponse.json(agent);
}
