import {
  encodeFunctionData,
  parseUnits,
} from "viem";
import { CELO_TOKENS, ERC20_ABI } from "./tokens";
import { appendAttributionTag } from "./attribution";

export const TREASURY_WALLET = "0x5F88E4aEfD97c5bE5Fb88e56F07ca4105c3FA346";
export const PROTOCOL_FEE_PERCENT = 0.002; // 0.2% fee

export interface ClientTransferParams {
  recipient: string;
  amount: string;
  token: string;
}

export interface ClientTransferResult {
  success: boolean;
  txHash?: string;
  explorerUrl?: string;
  error?: string;
}

export async function requestCeloNetwork(): Promise<boolean> {
  if (typeof window === "undefined" || !(window as any).ethereum) return false;
  const ethereum = (window as any).ethereum;

  try {
    // Try to switch to Celo Mainnet
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0xa4ec" }], // 42220 in hex
    });
    return true;
  } catch (switchError: any) {
    // If chain is not added, add Celo Mainnet
    if (switchError.code === 4902 || switchError.code === -32603) {
      try {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: "0xa4ec",
              chainName: "Celo Mainnet",
              nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
              rpcUrls: ["https://forno.celo.org"],
              blockExplorerUrls: ["https://celoscan.io"],
            },
          ],
        });
        return true;
      } catch (addError) {
        console.error("Failed to add Celo network:", addError);
        return false;
      }
    }
    console.error("Failed to switch to Celo network:", switchError);
    return false;
  }
}

export async function executeLiveClientTransfer(
  params: ClientTransferParams
): Promise<ClientTransferResult> {
  if (typeof window === "undefined" || !(window as any).ethereum) {
    return { success: false, error: "No Web3 wallet (MetaMask or MiniPay) detected." };
  }

  const { recipient, amount, token } = params;
  const isSwitched = await requestCeloNetwork();
  if (!isSwitched) {
    return { success: false, error: "Please switch your wallet to Celo Mainnet." };
  }

  const ethereum = (window as any).ethereum;

  try {
    const accounts = (await ethereum.request({ method: "eth_requestAccounts" })) as string[];
    const account = accounts[0];
    if (!account) {
      return { success: false, error: "Wallet not connected." };
    }

    const tokenKey = token.toUpperCase();
    const tokenInfo = CELO_TOKENS[tokenKey] || CELO_TOKENS["cUSD"];
    const tokenContract = tokenInfo.mainnetAddress;

    const parsedAmount = parseUnits(amount, tokenInfo.decimals);

    // 1. Encode transfer function with ERC-8021 attribution tag (celo_97f21f965c25)
    const baseCalldata = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [recipient as `0x${string}`, parsedAmount],
    });

    const taggedCalldata = appendAttributionTag(baseCalldata, "celo_97f21f965c25");

    // 2. Prompt user wallet to sign & broadcast transaction directly via RPC
    const txHash = (await ethereum.request({
      method: "eth_sendTransaction",
      params: [
        {
          from: account,
          to: tokenContract,
          data: taggedCalldata,
          value: "0x0",
        },
      ],
    })) as string;

    const explorerUrl = `https://celoscan.io/tx/${txHash}`;

    return {
      success: true,
      txHash,
      explorerUrl,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || "User rejected transaction or transfer failed.",
    };
  }
}

