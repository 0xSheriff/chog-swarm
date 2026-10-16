/**
 * lib/constants.ts — Single source of truth for all canonical addresses.
 *
 * NEVER hardcode these values elsewhere. Import from here.
 */

/** Chog Genesis NFT contract on Monad Mainnet (Chain ID 143). */
export const CHOG_GENESIS_ADDRESS =
  '0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763' as const;

/** $CHOG ERC-20 token contract on Monad Mainnet (Chain ID 143). */
export const CHOG_TOKEN_ADDRESS =
  '0x350035555E10d9AfAF1566AaebfCeD5BA6C27777' as const;

/** EVM null address — never a valid player. */
export const NULL_ADDRESS =
  '0x0000000000000000000000000000000000000000' as const;

/** Total supply of Chog Genesis NFTs. */
export const CHOG_TOTAL_SUPPLY = 1969 as const;

/**
 * Addresses that must NEVER appear as leaderboard players.
 * Checked lowercase; add any new system/contract addresses here.
 */
export const FORBIDDEN_PLAYER_ADDRESSES: ReadonlySet<string> = new Set([
  CHOG_GENESIS_ADDRESS.toLowerCase(),
  CHOG_TOKEN_ADDRESS.toLowerCase(),
  NULL_ADDRESS.toLowerCase(),
]);
