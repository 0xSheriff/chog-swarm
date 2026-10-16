import fs from 'fs';
import path from 'path';
import { createPublicClient, http } from 'viem';
import { monadMainnet, CHOG_GENESIS_ADDRESS, ERC721_ABI } from '../lib/monad-chain.ts';

const client = createPublicClient({
  chain: monadMainnet,
  transport: http('https://rpc.monad.xyz', {
    retryCount: 3,
    retryDelay: 800,
    timeout: 10000,
  }),
});

const OUTPUT_FILE = path.resolve('data/token-owners.json');
const TOTAL_SUPPLY = 1969;

async function main() {
  console.log(`Indexing on-chain owners for all ${TOTAL_SUPPLY} Chogs from Monad Mainnet...`);

  let ownersMap = {};
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      ownersMap = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
    } catch (_) {}
  }

  const idsToFetch = [];
  for (let i = 1; i <= TOTAL_SUPPLY; i++) {
    if (!ownersMap[i]) {
      idsToFetch.push(i);
    }
  }

  console.log(`Found ${Object.keys(ownersMap).length} cached owners. Fetching ${idsToFetch.length} remaining...`);

  const BATCH_SIZE = 40;
  for (let i = 0; i < idsToFetch.length; i += BATCH_SIZE) {
    const chunk = idsToFetch.slice(i, i + BATCH_SIZE);
    const promises = chunk.map(async (id) => {
      try {
        const owner = await client.readContract({
          address: CHOG_GENESIS_ADDRESS,
          abi: ERC721_ABI,
          functionName: 'ownerOf',
          args: [BigInt(id)],
        });
        ownersMap[id] = owner.toLowerCase();
      } catch (err) {
        console.warn(`Failed ownerOf for #${id}: ${err.message}`);
      }
    });

    await Promise.all(promises);
    process.stdout.write(`Indexed ${Math.min(i + BATCH_SIZE, idsToFetch.length)} / ${idsToFetch.length}...\r`);
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(ownersMap, null, 2));
  console.log(`\nSuccessfully indexed ${Object.keys(ownersMap).length} token owners to ${OUTPUT_FILE}`);
}

main().catch(console.error);
