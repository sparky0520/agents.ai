import { NextResponse } from "next/server";
import { getAgents, saveAgent } from "@/lib/agent-utils";

export async function GET() {
  // fetch agents from MongoDB
  const agents = await getAgents();

  return NextResponse.json(agents);
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const files_data: { name: string; content: string }[] = [];

    // Extract files
    // Expected keys: 'agent', 'input_schema', 'output_schema', 'script'
    // But let's be flexible and just take all files if possible, or expect specific names.
    // The requirement says "uploading the 4 files". Let's assume the client sends them with keys matching filenames or just 'files'.

    // Let's look for specific files to ensure validity
    const requiredFiles = [
      "agent.yaml",
      "input_schema.json",
      "output_schema.json",
    ];
    const scriptFile = formData.get("script"); // might be named differently

    // Iterate over formData to find files
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        files_data.push({
          name: value.name,
          content: await value.text(),
        });
      }
    }

    if (files_data.length < 4) {
      return NextResponse.json(
        {
          error:
            "Missing required files. Need agent.yaml, schemas, and script.",
        },
        { status: 400 },
      );
    }

    const price = (formData.get("price") as string) || "0.10 XLM";
    const tags = ((formData.get("tags") as string) || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    const author = "User"; // TODO: get from auth

    const agentId = await saveAgent(files_data, { price, tags, author });

    return NextResponse.json({ success: true, agentId });
  } catch (error: any) {
    console.error("Failed to publish agent:", error);
    return NextResponse.json(
      { error: error.message || "Failed to publish agent" },
      { status: 500 },
    );
  }
}
