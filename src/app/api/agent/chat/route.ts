import { NextResponse } from "next/server";
import { parsePaymentPrompt } from "@/lib/agent/parser";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, userAddress } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "A payment prompt string is required." }, { status: 400 });
    }

    const parsed = parsePaymentPrompt(prompt, userAddress);

    return NextResponse.json({
      success: true,
      data: parsed,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to parse payment intention." },
      { status: 500 }
    );
  }
}
