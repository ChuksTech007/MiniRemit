export interface TokenInfo {
  symbol: string;
  name: string;
  decimals: number;
  mainnetAddress: `0x${string}`;
  sepoliaAddress: `0x${string}`;
}

export const CELO_TOKENS: Record<string, TokenInfo> = {
  cUSD: {
    symbol: "cUSD",
    name: "Celo Dollar",
    decimals: 18,
    mainnetAddress: "0x765DE816845861e75A25fCA122bb6898B8B1282a",
    sepoliaAddress: "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1",
  },
  USDC: {
    symbol: "USDC",
    name: "USD Coin (Native)",
    decimals: 6,
    mainnetAddress: "0xcebA9300f2b948710d2653dD7B07f33A8B32118C",
    sepoliaAddress: "0x2F25deB6038AC20A6Ed274574780286A83a54720",
  },
  USDT: {
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
    mainnetAddress: "0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e",
    sepoliaAddress: "0x617f61124673A6B4863E2Fa49E7fD9Dcb0E5C9A3",
  },
};

export const ERC20_ABI = [
  {
    type: "function",
    name: "transfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "decimals",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
  },
  {
    type: "function",
    name: "symbol",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
] as const;

export function getTokenAddress(symbol: string): `0x${string}` | null {
  const isMainnet = process.env.CELO_NETWORK === "celo-mainnet";
  const token = CELO_TOKENS[symbol.toUpperCase()] || CELO_TOKENS["cUSD"];
  if (!token) return null;
  return isMainnet ? token.mainnetAddress : token.sepoliaAddress;
}

