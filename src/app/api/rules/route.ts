import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { memoryStore } from "@/lib/store";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userAddress = searchParams.get("userAddress");

    try {
      const rules = await prisma.rule.findMany({
        where: userAddress ? { userAddress: { equals: userAddress } } : undefined,
        include: {
          executions: {
            orderBy: { createdAt: "desc" },
            take: 5,
          },
        },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ success: true, data: rules });
    } catch (dbErr) {
      // Fallback to memory store if database is unavailable
      const rules = memoryStore.getRules();
      return NextResponse.json({ success: true, data: rules });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to fetch rules" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      userAddress,
      title,
      prompt,
      ruleType,
      token,
      amount,
      recipient,
      schedule,
      condition,
    } = body;

    if (!userAddress || !recipient || !amount || !title) {
      return NextResponse.json(
        { error: "Missing required fields: userAddress, recipient, amount, title" },
        { status: 400 }
      );
    }

    try {
      const newRule = await prisma.rule.create({
        data: {
          userAddress,
          title,
          prompt: prompt || title,
          ruleType: ruleType || "SCHEDULED",
          token: token || "cUSD",
          amount: String(amount),
          recipient,
          schedule: schedule || null,
          condition: condition || null,
          status: "ACTIVE",
        },
      });
      return NextResponse.json({ success: true, data: newRule });
    } catch (dbErr) {
      // Fallback to memory store
      const newRule = memoryStore.createRule({
        userAddress,
        title,
        prompt: prompt || title,
        ruleType: ruleType || "SCHEDULED",
        token: token || "cUSD",
        amount: String(amount),
        recipient,
        schedule: schedule || null,
        condition: condition || null,
        status: "ACTIVE",
      });
      return NextResponse.json({ success: true, data: newRule });
    }
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create rule" },
      { status: 500 }
    );
  }
}
