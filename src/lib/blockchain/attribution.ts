import { stringToHex, concatHex } from "viem";

export function toDataSuffix(tags: string | string[]): `0x${string}` {
  const tagList = Array.isArray(tags) ? tags : [tags];
  const hexParts: `0x${string}`[] = [];

  for (const tag of tagList) {
    if (!tag) continue;
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
  const defaultTag = process.env.CELO_ATTRIBUTION_TAG || "celo_97f21f965c25";
  const tagToUse = customTag || defaultTag;
  const suffix = toDataSuffix(tagToUse);

  if (suffix === "0x") return calldata;
  return concatHex([calldata, suffix]);
}
