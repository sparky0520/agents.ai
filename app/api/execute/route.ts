import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    let endpoint = "https://agents-ai-python.vercel.app/execute";
    if (body.requests && Array.isArray(body.requests)) {
      endpoint = "https://agents-ai-python.vercel.app/execute_batch";
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorJson;
      try {
        errorJson = JSON.parse(errorText);
      } catch (e) {
        // If not json, use text
        return NextResponse.json(
          {
            error: `Service error: ${response.statusText}`,
            details: errorText,
          },
          { status: response.status },
        );
      }

      return NextResponse.json(errorJson, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Proxy error:", error);
    return NextResponse.json(
      {
        error: "Failed to connect to execution service",
        details: error.message,
      },
      { status: 500 },
    );
  }
}
