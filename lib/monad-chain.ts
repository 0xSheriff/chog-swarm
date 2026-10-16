import { defineChain, createPublicClient, http, type Address } from 'viem';
import {
  CHOG_GENESIS_ADDRESS,
  CHOG_TOKEN_ADDRESS,
} from '@/lib/constants';
// Re-export so consumers can still import from '@/lib/monad-chain'
export { CHOG_GENESIS_ADDRESS, CHOG_TOKEN_ADDRESS } from '@/lib/constants';
export type { Address };

export const monadMainnet = defineChain({
  id: 143,
  name: 'Monad',
  nativeCurrency: {
    name: 'Monad',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.monad.xyz'],
    },
    public: {
      http: ['https://rpc.monad.xyz'],
    },
  },
  blockExplorers: {
    default: {
      name: 'MonadScan',
      url: 'https://monadscan.com',
    },
  },
});

export const ERC721_ABI = [
  {
    name: 'ownerOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'tokenURI',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;

export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
] as const;

export const monadPublicClient = createPublicClient({
  chain: monadMainnet,
  transport: http('https://rpc.monad.xyz', {
    retryCount: 3,
    retryDelay: 1000,
    timeout: 8000,
  }),
});

/**
 * Hard NFT Essentiality Gate:
 * Queries the on-chain Chog Genesis contract directly on Monad.
 */
export async function verifyChogOwnershipOnChain(
  walletAddress: Address | string | null | undefined,
  tokenId: number
): Promise<{ verified: boolean; owner: string | null; error?: string }> {
  if (!walletAddress) {
    return { verified: false, owner: null, error: 'No wallet connected.' };
  }

  try {
    const owner = await monadPublicClient.readContract({
      address: CHOG_GENESIS_ADDRESS,
      abi: ERC721_ABI,
      functionName: 'ownerOf',
      args: [BigInt(tokenId)],
    });

    const isOwner = owner.toLowerCase() === walletAddress.toLowerCase();
    return {
      verified: isOwner,
      owner,
      error: isOwner ? undefined : `Address ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)} does not own Chog #${tokenId} on-chain (Current Owner: ${owner.slice(0, 6)}...${owner.slice(-4)}).`,
    };
  } catch (err: any) {
    return {
      verified: false,
      owner: null,
      error: `On-chain check failed: ${err.message || 'Unknown RPC error'}`,
    };
  }
}

/**
 * Read-only $CHOG balance query
 */
export async function getChogTokenBalance(walletAddress: Address | string): Promise<{ balance: bigint; formatted: string }> {
  try {
    const bal = await monadPublicClient.readContract({
      address: CHOG_TOKEN_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [walletAddress as Address],
    });
    return {
      balance: bal,
      formatted: (Number(bal) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 }),
    };
  } catch (_) {
    return { balance: BigInt(0), formatted: '0' };
  }
}
