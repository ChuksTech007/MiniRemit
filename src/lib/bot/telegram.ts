import { parsePaymentPrompt } from "../agent/parser";
import { prisma } from "../db";

/**
 * Telegram bot message handler
 * Processes incoming chat commands from users on Telegram to create automated remittance rules.
 */
export async function handleTelegramMessage(
  chatId: number,
  username: string | undefined,
  text: string,
  userWalletAddress: string
) {
  if (!text) return "Please send a message describing what payment rule you want to automate.";

  if (text === "/start" || text === "/help") {
    return (
      `👋 Welcome to *MiniRemit* on Celo!\n\n` +
      `I am your autonomous financial agent. Send me any remittance or payment rule in plain English, and I will handle it on Celo automatically.\n\n` +
      `*Examples:*\n` +
      `• _Send 10 cUSD to 0x5F88... every Friday at 9am_\n` +
      `• _Auto-split 20% of incoming cUSD to 0x5F88..._\n` +
      `• _Pay electricity bill 15 USDC on the 1st of every month_`
    );
  }

  // Parse intention
  const parsed = parsePaymentPrompt(text, userWalletAddress);

  // Save rule to database
  const rule = await prisma.rule.create({
    data: {
      userAddress: userWalletAddress,
      title: parsed.title,
      prompt: text,
      ruleType: parsed.ruleType,
      token: parsed.token,
      amount: parsed.amount,
      recipient: parsed.recipient,
      schedule: parsed.schedule || null,
      condition: parsed.condition || null,
      status: "ACTIVE",
    },
  });

  return (
    `✅ *Rule Activated!*\n\n` +
    `• *Title:* ${rule.title}\n` +
    `• *Action:* ${parsed.summary}\n` +
    `• *Token & Amount:* ${rule.amount} ${rule.token}\n` +
    `• *Recipient:* \`${rule.recipient}\`\n` +
    `• *Status:* 🟢 ACTIVE\n\n` +
    `All automated transfers will be tagged with ERC-8021 attribution on Celo.`
  );
}

