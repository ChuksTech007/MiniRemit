import { isAddress } from "viem";

export interface ParsedRule {
  title: string;
  ruleType: "SCHEDULED" | "SPLIT_INCOMING" | "BALANCE_TRIGGER";
  token: "cUSD" | "USDC" | "USDT" | "CELO";
  amount: string;
  recipient: string;
  schedule?: string;
  condition?: string;
  summary: string;
  confidence: number;
}

/**
 * Natural language rule parser.
 * Parses plain English payment intentions into actionable, verifiable rules.
 */
export function parsePaymentPrompt(prompt: string, fallbackRecipient?: string): ParsedRule {
  const text = prompt.trim();
  const lower = text.toLowerCase();

  // 1. Extract Token
  let token: "cUSD" | "USDC" | "USDT" | "CELO" = "cUSD";
  if (lower.includes("usdc")) token = "USDC";
  else if (lower.includes("usdt")) token = "USDT";
  else if (lower.includes("celo")) token = "CELO";
  else if (lower.includes("cusd") || lower.includes("dollar") || lower.includes("$")) token = "cUSD";

  // 2. Extract Recipient Address (0x...)
  const addressMatch = text.match(/0x[a-fA-F0-9]{40}/);
  const recipient = addressMatch ? addressMatch[0] : fallbackRecipient || "0x0000000000000000000000000000000000000000";

  // 3. Extract Amount or Percentage
  let amount = "5.0";
  const percentMatch = text.match(/(\d+(?:\.\d+)?)\s*%/);
  const amountMatch = text.match(/\$?\s*(\d+(?:\.\d+)?)\s*(?:cusd|usdc|usdt|celo|dollars?)?/i);

  if (percentMatch) {
    amount = `${percentMatch[1]}%`;
  } else if (amountMatch && amountMatch[1]) {
    amount = amountMatch[1];
  }

  // 4. Determine Rule Type & Schedule
  let ruleType: "SCHEDULED" | "SPLIT_INCOMING" | "BALANCE_TRIGGER" = "SCHEDULED";
  let schedule: string | undefined = "0 9 * * 5"; // Default: Friday 9am
  let condition: string | undefined = undefined;

  if (lower.includes("split") || lower.includes("incoming") || lower.includes("receive")) {
    ruleType = "SPLIT_INCOMING";
    schedule = undefined;
    condition = `split_${amount}_on_receive`;
  } else if (lower.includes("balance") || lower.includes("more than") || lower.includes("greater than")) {
    ruleType = "BALANCE_TRIGGER";
    schedule = undefined;
    condition = "balance_threshold";
  } else {
    ruleType = "SCHEDULED";
    // Parse frequencies
    if (lower.includes("daily") || lower.includes("every day")) {
      schedule = "0 9 * * *"; // Every day at 9:00 AM
    } else if (lower.includes("friday")) {
      schedule = "0 9 * * 5"; // Every Friday at 9:00 AM
    } else if (lower.includes("monday")) {
      schedule = "0 9 * * 1"; // Every Monday at 9:00 AM
    } else if (lower.includes("month") || lower.includes("1st") || lower.includes("monthly")) {
      schedule = "0 9 1 * *"; // 1st of every month at 9:00 AM
    } else if (lower.includes("minute") || lower.includes("hourly") || lower.includes("test")) {
      schedule = "*/5 * * * *"; // Every 5 minutes (for demo/testing)
    }
  }

  // 5. Generate human-readable title and summary
  let title = `Recurring ${amount} ${token} Payment`;
  if (ruleType === "SPLIT_INCOMING") {
    title = `Auto-Split ${amount} ${token} to ${recipient.slice(0, 6)}...${recipient.slice(-4)}`;
  } else if (schedule === "0 9 * * 5") {
    title = `Weekly Friday ${amount} ${token} Remittance`;
  } else if (schedule === "0 9 1 * *") {
    title = `Monthly ${amount} ${token} Bill Payment`;
  }

  const summary =
    ruleType === "SCHEDULED"
      ? `Automatically sends ${amount} ${token} to ${recipient} on schedule (${schedule}).`
      : ruleType === "SPLIT_INCOMING"
      ? `Automatically routes ${amount} of incoming ${token} transfers to ${recipient}.`
      : `Trigger automated ${amount} ${token} payment when balance conditions are met.`;

  return {
    title,
    ruleType,
    token,
    amount,
    recipient,
    schedule,
    condition,
    summary,
    confidence: isAddress(recipient) ? 0.95 : 0.7,
  };
}

