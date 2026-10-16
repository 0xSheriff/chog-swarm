/**
 * tests/constants.test.ts
 *
 * Verifies:
 * 1. CHOG_GENESIS_ADDRESS and CHOG_TOKEN_ADDRESS are rejected as players.
 * 2. NULL_ADDRESS is rejected.
 * 3. A valid random wallet address is NOT rejected.
 * 4. Empty / falsy inputs are rejected.
 * 5. Address constants have the correct format.
 */
import { describe, it, expect } from 'vitest';
import {
  CHOG_GENESIS_ADDRESS,
  CHOG_TOKEN_ADDRESS,
  NULL_ADDRESS,
  FORBIDDEN_PLAYER_ADDRESSES,
} from '../lib/constants';
import { isForbiddenPlayer } from '../lib/leaderboard-store';

describe('Canonical contract addresses', () => {
  it('CHOG_GENESIS_ADDRESS matches expected value', () => {
    expect(CHOG_GENESIS_ADDRESS).toBe('0xc96d31F8626c6D03Fae5dCD3d61e3FB9F4a73763');
  });

  it('CHOG_TOKEN_ADDRESS matches expected value', () => {
    expect(CHOG_TOKEN_ADDRESS).toBe('0x350035555E10d9AfAF1566AaebfCeD5BA6C27777');
  });

  it('NULL_ADDRESS matches the EVM zero address', () => {
    expect(NULL_ADDRESS).toBe('0x0000000000000000000000000000000000000000');
  });

  it('All three forbidden addresses are in FORBIDDEN_PLAYER_ADDRESSES (lowercase)', () => {
    expect(FORBIDDEN_PLAYER_ADDRESSES.has(CHOG_GENESIS_ADDRESS.toLowerCase())).toBe(true);
    expect(FORBIDDEN_PLAYER_ADDRESSES.has(CHOG_TOKEN_ADDRESS.toLowerCase())).toBe(true);
    expect(FORBIDDEN_PLAYER_ADDRESSES.has(NULL_ADDRESS.toLowerCase())).toBe(true);
  });
});

describe('isForbiddenPlayer', () => {
  it('rejects CHOG_GENESIS_ADDRESS (exact case)', () => {
    expect(isForbiddenPlayer(CHOG_GENESIS_ADDRESS)).toBe(true);
  });

  it('rejects CHOG_GENESIS_ADDRESS (lowercase)', () => {
    expect(isForbiddenPlayer(CHOG_GENESIS_ADDRESS.toLowerCase())).toBe(true);
  });

  it('rejects CHOG_GENESIS_ADDRESS (uppercase)', () => {
    expect(isForbiddenPlayer(CHOG_GENESIS_ADDRESS.toUpperCase())).toBe(true);
  });

  it('rejects CHOG_TOKEN_ADDRESS (exact case)', () => {
    expect(isForbiddenPlayer(CHOG_TOKEN_ADDRESS)).toBe(true);
  });

  it('rejects CHOG_TOKEN_ADDRESS (lowercase)', () => {
    expect(isForbiddenPlayer(CHOG_TOKEN_ADDRESS.toLowerCase())).toBe(true);
  });

  it('rejects NULL_ADDRESS', () => {
    expect(isForbiddenPlayer(NULL_ADDRESS)).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isForbiddenPlayer('')).toBe(true);
  });

  it('does NOT reject a valid random player address', () => {
    // A realistic wallet address — not a contract address
    expect(isForbiddenPlayer('0xe0AbD864b96a6C72d80717a750245a9F60289c93')).toBe(false);
  });

  it('does NOT reject another valid player address', () => {
    expect(isForbiddenPlayer('0x3D38FeE3E1a4c43d8fcF715aA6C9ff025074E7E0')).toBe(false);
  });
});
