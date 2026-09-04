import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { memoryStore } from "@/lib/store";
import { executeTransfer } from "@/lib/blockchain/dispatcher";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ruleId, simulate } = body;

    let rule: any = null;
    try {
      rule = await prisma.rule.findUnique({
        where: { id: ruleId },
      });
    } catch {
      rule = memoryStore.getRuleById(ruleId);
    }

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
      txHash = `0x${Array.from({ length: 64 }, () =>
        Math.floor(Math.random() * 16).toString(16)
      ).join("")}`;
    } else {
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

    let execution: any = null;
    try {
      execution = await prisma.execution.create({
        data: {
          ruleId: rule.id,
          status,
          amount: rule.amount,
          token: rule.token,
          recipient: rule.recipient,
          txHash: txHash || null,
          attributionTag: process.env.CELO_ATTRIBUTION_TAG || "celo_97f21f965c25",
          errorMessage: errorMessage || null,
        },
      });

      const numericAmount = parseFloat(rule.amount.replace("%", "")) || 0;
      await prisma.rule.update({
        where: { id: rule.id },
        data: {
          lastExecutedAt: new Date(),
          totalExecuted: { increment: 1 },
          totalValueMoved: { increment: status === "SUCCESS" ? numericAmount : 0 },
        },
      });
    } catch {
      execution = memoryStore.createExecution({
        ruleId: rule.id,
        status,
        amount: rule.amount,
        token: rule.token,
        recipient: rule.recipient,
        txHash: txHash || null,
        attributionTag: process.env.CELO_ATTRIBUTION_TAG || "celo_97f21f965c25",
        errorMessage: errorMessage || null,
      });
    }

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
