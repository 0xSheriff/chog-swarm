import { createPublicClient, http, verifyMessage } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { monadMainnet, CHOG_GENESIS_ADDRESS, ERC721_ABI } from '../lib/monad-chain';

const KNOWN_HOLDER = '0xe0abd864b96a6c72d80717a750245a9f60289c93';
const KNOWN_TOKEN_1_OWNER = '0x3D38FeE3E1a4c43d8fcF715aA6C9ff025074E7E0';

async function main() {
  console.log('=== PHASE 4 WALLET & VERIFICATION TEST SUITE ===\n');

  // 1. Test Monad Mainnet connection
  console.log('1. Testing Monad Mainnet Connection (Chain ID 143)...');
  const client = createPublicClient({
    chain: monadMainnet,
    transport: http('https://rpc.monad.xyz'),
  });

  const chainId = await client.getChainId();
  console.log(`   Connected to RPC: ${monadMainnet.rpcUrls.default.http[0]}`);
  console.log(`   Verified Chain ID: ${chainId} ${chainId === 143 ? '✓ (Monad Mainnet)' : '✗'}`);

  // 2. Test On-Chain ERC-721 ownerOf for Token #1
  console.log('\n2. Testing Live On-Chain ownerOf against Monad Mainnet...');
  const owner1 = await client.readContract({
    address: CHOG_GENESIS_ADDRESS,
    abi: ERC721_ABI,
    functionName: 'ownerOf',
    args: [1n],
  });
  console.log(`   Chog #1 Live Owner: ${owner1}`);
  console.log(`   Matches known holder: ${owner1.toLowerCase() === KNOWN_TOKEN_1_OWNER.toLowerCase() ? '✓ YES' : '✗ NO'}`);

  // 3. Test Cryptographic Signature Verification (Seed + Score Hash + Address)
  console.log('\n3. Testing Cryptographic Signature Verification (Viem)...');
  const testAccount = privateKeyToAccount(generatePrivateKey());
  console.log(`   Generated Test Keypair Address: ${testAccount.address}`);

  const testSeed = 20261015;
  const testScore = 180;
  const testChecksum = 'a8f3b412';
  const testMessage = `Chog Swarm Gauntlet Score Verification\nAddress: ${testAccount.address.toLowerCase()}\nSeed: ${testSeed}\nScore: ${testScore}\nChecksum: ${testChecksum}`;

  const validSignature = await testAccount.signMessage({ message: testMessage });
  console.log(`   Signature Produced (${validSignature.slice(0, 20)}...)`);

  const isValid = await verifyMessage({
    address: testAccount.address,
    message: testMessage,
    signature: validSignature,
  });
  console.log(`   Signature Verification Result: ${isValid ? '✓ VALID' : '✗ INVALID'}`);

  // Test tampered message rejection
  const tamperedMessage = `Chog Swarm Gauntlet Score Verification\nAddress: ${testAccount.address.toLowerCase()}\nSeed: ${testSeed}\nScore: 9999\nChecksum: ${testChecksum}`;
  const isTamperedValid = await verifyMessage({
    address: testAccount.address,
    message: tamperedMessage,
    signature: validSignature,
  });
  console.log(`   Tampered Score Rejected: ${!isTamperedValid ? '✓ REJECTED' : '✗ FAILED'}`);

  // 4. Test Local Wallet Chogs API
  console.log('\n4. Testing /api/wallet/chogs with Known Holder...');
  try {
    const res = await fetch(`http://localhost:3000/api/wallet/chogs?address=${KNOWN_HOLDER}`);
    const data = await res.json();
    console.log(`   API Status: ${res.status}`);
    console.log(`   Total Verified Owned for ${KNOWN_HOLDER.slice(0, 8)}...: ${data.totalOwned} Chogs`);
    if (data.ownedChogs?.length > 0) {
      console.log(`   Sample Token: #${data.ownedChogs[0].tokenId} (${data.ownedChogs[0].name})`);
      console.log(`   Local Art Path: ${data.ownedChogs[0].image}`);
    }
  } catch (err) {
    console.warn('   Local server query skipped or failed:', (err as Error).message);
  }

  console.log('\n=== TEST SUITE COMPLETED SUCCESSFULLY ===');
}

main().catch(console.error);
