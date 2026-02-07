import { NextResponse } from "next/server";
import { AGENTS } from "@/lib/agents";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const agent = AGENTS[id];

  if (!agent) {
    return new NextResponse("Agent not found", { status: 404 });
  }

  return NextResponse.json(agent);
}
