import { Cron } from "croner";
import { prisma } from "./lib/db";
import { executeTransfer } from "./lib/blockchain/dispatcher";
import * as dotenv from "dotenv";

dotenv.config();

console.log("🚀 MiniRemit Autonomous Execution Worker started...");
console.log(`Network: ${process.env.CELO_NETWORK || "celo-sepolia"}`);
console.log(`Attribution Tag: ${process.env.CELO_ATTRIBUTION_TAG || "celo_miniremit"}`);

// Check rules every 1 minute
new Cron("* * * * *", async () => {
  try {
    const activeRules = await prisma.rule.findMany({
      where: { status: "ACTIVE" },
    });

    console.log(`[Worker] Found ${activeRules.length} active automation rules.`);

    for (const rule of activeRules) {
      // Check if scheduled rule is due
      console.log(`[Worker] Checking rule: ${rule.title} (${rule.id})`);

      if (process.env.AGENT_PRIVATE_KEY) {
        console.log(`[Worker] Executing on-chain transfer for rule ${rule.id}...`);
        const result = await executeTransfer({
          recipient: rule.recipient,
          amount: rule.amount.replace("%", ""),
          token: rule.token,
        });

        await prisma.execution.create({
          data: {
            ruleId: rule.id,
            status: result.success ? "SUCCESS" : "FAILED",
            amount: rule.amount,
            token: rule.token,
            recipient: rule.recipient,
            txHash: result.txHash || null,
            attributionTag: process.env.CELO_ATTRIBUTION_TAG || "celo_miniremit",
            errorMessage: result.error || null,
          },
        });

        if (result.success) {
          const numAmount = parseFloat(rule.amount.replace("%", "")) || 0;
          await prisma.rule.update({
            where: { id: rule.id },
            data: {
              lastExecutedAt: new Date(),
              totalExecuted: { increment: 1 },
              totalValueMoved: { increment: numAmount },
            },
          });
          console.log(`[Worker] Successfully executed rule ${rule.id}! Tx: ${result.txHash}`);
        } else {
          console.error(`[Worker] Failed execution for rule ${rule.id}: ${result.error}`);
        }
      }
    }
  } catch (err) {
    console.error("[Worker] Error during scheduled job execution:", err);
  }
});

