import { stringToHex, concatHex } from "viem";

/**
 * ERC-8021 Attribution Tag Encoder
 * Encodes attribution tags into transaction calldata suffixes so transactions
 * are automatically indexed on Dune Analytics for the hackathon leaderboard.
 */
export function toDataSuffix(tags: string | string[]): `0x${string}` {
  const tagList = Array.isArray(tags) ? tags : [tags];
  const hexParts: `0x${string}`[] = [];

  for (const tag of tagList) {
    if (!tag) continue;
    // Standard ERC-8021 attribution tag formatting
    const cleaned = tag.trim();
    const hex = stringToHex(cleaned);
    hexParts.push(hex);
  }

  if (hexParts.length === 0) return "0x";
  return concatHex(hexParts);
}

export function appendAttributionTag(
  calldata: `0x${string}`,
  customTag?: string
): `0x${string}` {
  const defaultTag = process.env.CELO_ATTRIBUTION_TAG || "celo_miniremit";
  const tagToUse = customTag || defaultTag;
  const suffix = toDataSuffix(tagToUse);

  if (suffix === "0x") return calldata;
  return concatHex([calldata, suffix]);
}

