import { encodeFunctionData, parseUnits, isAddress } from "viem";
import { getPublicClient, getWalletClient, getActiveChain } from "./celo";
import { CELO_TOKENS, ERC20_ABI, getTokenAddress } from "./tokens";
import { appendAttributionTag } from "./attribution";

export interface TransferParams {
  recipient: string;
  amount: string;
  token: string;
  customAttributionTag?: string;
}

export interface TransferResult {
  success: boolean;
  txHash?: `0x${string}`;
  blockNumber?: bigint;
  explorerUrl?: string;
  error?: string;
}

export async function executeTransfer(params: TransferParams): Promise<TransferResult> {
  const { recipient, amount, token, customAttributionTag } = params;

  if (!isAddress(recipient)) {
    return { success: false, error: `Invalid recipient address: ${recipient}` };
  }

  const walletClient = getWalletClient();
  if (!walletClient) {
    return {
      success: false,
      error: "Agent wallet is not configured (AGENT_PRIVATE_KEY missing in environment).",
    };
  }

  const publicClient = getPublicClient();
  const chain = getActiveChain();
  const tokenKey = token.toUpperCase();

  try {
    const tokenInfo = CELO_TOKENS[tokenKey] || CELO_TOKENS["cUSD"];
    const tokenContract = getTokenAddress(tokenKey);

    if (!tokenContract) {
      return { success: false, error: `Token contract not found for ${token}` };
    }

    const parsedAmount = parseUnits(amount, tokenInfo.decimals);

    const baseCalldata = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [recipient as `0x${string}`, parsedAmount],
    });

    const taggedCalldata = appendAttributionTag(baseCalldata, customAttributionTag);

    const txHash = await walletClient.sendTransaction({
      to: tokenContract,
      data: taggedCalldata,
      value: BigInt(0),
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

    const explorerBase = chain.blockExplorers?.default.url || "https://celoscan.io";
    const explorerUrl = `${explorerBase}/tx/${txHash}`;

    return {
      success: receipt.status === "success",
      txHash,
      blockNumber: receipt.blockNumber,
      explorerUrl,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "Unknown error during transaction execution",
    };
  }
}
