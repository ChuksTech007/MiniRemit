import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { executeTransfer } from "@/lib/blockchain/dispatcher";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ruleId, simulate } = body;

    const rule = await prisma.rule.findUnique({
      where: { id: ruleId },
    });

    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    if (rule.status !== "ACTIVE") {
      return NextResponse.json(
        { error: `Rule is currently ${rule.status}` },
        { status: 400 }
      );
    }

    let txHash: string | undefined = undefined;
    let status: "SUCCESS" | "FAILED" = "SUCCESS";
    let errorMessage: string | undefined = undefined;

    if (simulate || !process.env.AGENT_PRIVATE_KEY) {
      // Simulation mode (for testing without spending real gas)
      txHash = `0x${Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("")}`;
    } else {
      // Real Celo on-chain transfer with ERC-8021 Hackathon Attribution Tag
      const result = await executeTransfer({
        recipient: rule.recipient,
        amount: rule.amount.replace("%", ""),
        token: rule.token,
      });

      if (!result.success) {
        status = "FAILED";
        errorMessage = result.error;
      } else {
        txHash = result.txHash;
      }
    }

    // Record execution in database
    const execution = await prisma.execution.create({
      data: {
        ruleId: rule.id,
        status,
        amount: rule.amount,
        token: rule.token,
        recipient: rule.recipient,
        txHash: txHash || null,
        attributionTag: process.env.CELO_ATTRIBUTION_TAG || "celo_miniremit",
        errorMessage: errorMessage || null,
      },
    });

    // Update rule metadata
    const numericAmount = parseFloat(rule.amount.replace("%", "")) || 0;
    await prisma.rule.update({
      where: { id: rule.id },
      data: {
        lastExecutedAt: new Date(),
        totalExecuted: { increment: 1 },
        totalValueMoved: { increment: status === "SUCCESS" ? numericAmount : 0 },
      },
    });

    return NextResponse.json({
      success: status === "SUCCESS",
      data: execution,
      error: errorMessage,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Execution failed" },
      { status: 500 }
    );
  }
}

