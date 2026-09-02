import { createPublicClient, createWalletClient, http, defineChain } from "viem";
import { privateKeyToAccount } from "viem/accounts";

export const celoMainnet = defineChain({
  id: 42220,
  name: "Celo Mainnet",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.CELO_MAINNET_RPC || "https://forno.celo.org"] },
  },
  blockExplorers: {
    default: { name: "CeloScan", url: "https://celoscan.io" },
  },
});

export const celoSepolia = defineChain({
  id: 11142220,
  name: "Celo Sepolia",
  nativeCurrency: { name: "CELO", symbol: "CELO", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.CELO_SEPOLIA_RPC || "https://forno.celo-sepolia.celo-testnet.org"] },
  },
  blockExplorers: {
    default: { name: "CeloScan Sepolia", url: "https://sepolia.celoscan.io" },
  },
});

export function getActiveChain() {
  const isMainnet = process.env.CELO_NETWORK === "celo-mainnet";
  return isMainnet ? celoMainnet : celoSepolia;
}

export function getPublicClient() {
  const chain = getActiveChain();
  return createPublicClient({
    chain,
    transport: http(),
  });
}

export function getWalletClient(privateKey?: string) {
  const key = privateKey || process.env.AGENT_PRIVATE_KEY;
  if (!key) return null;
  const formattedKey = key.startsWith("0x") ? (key as `0x${string}`) : (`0x${key}` as `0x${string}`);
  const account = privateKeyToAccount(formattedKey);
  const chain = getActiveChain();

  return createWalletClient({
    account,
    chain,
    transport: http(),
  });
}

