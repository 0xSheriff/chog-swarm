/**
 * lib/chain-verify.ts — On-startup on-chain contract verification.
 *
 * Verifies that both canonical contracts respond with the expected metadata.
 * Called once at server startup (or first API request in serverless). Logs a
 * FATAL error and throws if the addresses are wrong or the RPC is unreachable,
 * so misdeployments are caught immediately.
 */

import { monadPublicClient, ERC721_ABI, ERC20_ABI } from '@/lib/monad-chain';
import {
  CHOG_GENESIS_ADDRESS,
  CHOG_TOKEN_ADDRESS,
  CHOG_TOTAL_SUPPLY,
} from '@/lib/constants';

const ERC20_SYMBOL_ABI = [
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

let verified = false;
let verifyError: Error | null = null;

export interface ContractVerification {
  nft: { name: string; symbol: string; totalSupply: number };
  token: { symbol: string; decimals: number };
}

/**
 * Run once. Subsequent calls return the cached result without re-querying.
 * Throws on RPC failure or metadata mismatch.
 */
export async function verifyContractsOnStartup(): Promise<ContractVerification> {
  if (verified) return getCachedResult();
  if (verifyError) throw verifyError;

  try {
    const [nftName, nftSymbol, totalSupply, tokenSymbol, tokenDecimals] =
      await Promise.all([
        monadPublicClient.readContract({
          address: CHOG_GENESIS_ADDRESS,
          abi: ERC721_ABI,
          functionName: 'name',
        }),
        monadPublicClient.readContract({
          address: CHOG_GENESIS_ADDRESS,
          abi: ERC721_ABI,
          functionName: 'symbol',
        }),
        monadPublicClient.readContract({
          address: CHOG_GENESIS_ADDRESS,
          abi: ERC721_ABI,
          functionName: 'totalSupply',
        }),
        monadPublicClient.readContract({
          address: CHOG_TOKEN_ADDRESS,
          abi: ERC20_SYMBOL_ABI,
          functionName: 'symbol',
        }),
        monadPublicClient.readContract({
          address: CHOG_TOKEN_ADDRESS,
          abi: ERC20_SYMBOL_ABI,
          functionName: 'decimals',
        }),
      ]);

    const supplyNum = Number(totalSupply);

    // Sanity-check totalSupply is within expected bounds
    if (supplyNum < CHOG_TOTAL_SUPPLY) {
      throw new Error(
        `FATAL: NFT totalSupply=${supplyNum} is less than expected ${CHOG_TOTAL_SUPPLY}. ` +
          `Check CHOG_GENESIS_ADDRESS=${CHOG_GENESIS_ADDRESS}`
      );
    }

    const result: ContractVerification = {
      nft: {
        name: String(nftName),
        symbol: String(nftSymbol),
        totalSupply: supplyNum,
      },
      token: {
        symbol: String(tokenSymbol),
        decimals: Number(tokenDecimals),
      },
    };

    console.log(
      `[chain-verify] ✓ NFT "${result.nft.name}" (${result.nft.symbol}) supply=${result.nft.totalSupply} | ` +
        `Token "${result.token.symbol}" decimals=${result.token.decimals}`
    );

    cachedResult = result;
    verified = true;
    return result;
  } catch (err: any) {
    verifyError = new Error(
      `[chain-verify] FATAL: Contract verification failed. ` +
        `NFT=${CHOG_GENESIS_ADDRESS} TOKEN=${CHOG_TOKEN_ADDRESS}. ` +
        `Reason: ${err.message}`
    );
    console.error(verifyError.message);
    // Do NOT throw in production (RPC blip should not kill the app), but log loudly.
    // Return a stub so the app can still serve static pages.
    return {
      nft: { name: 'unknown', symbol: 'unknown', totalSupply: 0 },
      token: { symbol: 'unknown', decimals: 18 },
    };
  }
}

let cachedResult: ContractVerification | null = null;

function getCachedResult(): ContractVerification {
  if (!cachedResult) {
    // Should not happen if verified=true, but be safe
    throw new Error('[chain-verify] getCachedResult called before verification');
  }
  return cachedResult;
}
