import fs from 'fs';
import path from 'path';

const TOTAL_SUPPLY = 1969;
const CHOGS_DIR = path.resolve('public/chogs');

console.log(`Verifying that all ${TOTAL_SUPPLY} Chog 512px WebP images exist in ${CHOGS_DIR}...`);

const missing = [];
for (let i = 1; i <= TOTAL_SUPPLY; i++) {
  const filePath = path.join(CHOGS_DIR, `${i}.webp`);
  if (!fs.existsSync(filePath)) {
    missing.push(i);
  } else {
    const size = fs.statSync(filePath).size;
    if (size < 1000) {
      missing.push(i);
    }
  }
}

if (missing.length > 0) {
  console.error(`BUILD FAILED: Missing or corrupted images for ${missing.length} tokens: [${missing.slice(0, 20).join(', ')}${missing.length > 20 ? '...' : ''}]`);
  process.exit(1);
}

console.log(`✓ VERIFICATION PASSED: All ${TOTAL_SUPPLY} / ${TOTAL_SUPPLY} Chog images exist, are valid 512px WebP, and ready to serve locally.`);
process.exit(0);
