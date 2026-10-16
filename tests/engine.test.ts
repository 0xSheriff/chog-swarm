import { describe, it, expect } from 'vitest';
import {
  compilePolicy,
  createMatch,
  stepMatch,
  runFullMatch,
  ArenaConfig
} from '../packages/engine/src';
import chog1 from '../fixtures/chog-1.json';
import chog143 from '../fixtures/chog-143.json';
import chog1462 from '../fixtures/chog-1462.json';

describe('Deterministic Arena Engine', () => {
  it('guarantees identical output for the exact same seed, policies, and rules version', () => {
    const policy1 = compilePolicy(chog1);
    const policy2 = compilePolicy(chog143);

    const config: ArenaConfig = {
      seed: 4201337,
      rulesVersion: 'v1.0',
      gridWidth: 10,
      gridHeight: 10,
      maxTurns: 30,
      agents: [
        { id: 'agent-1', tokenId: 1, name: 'Chog #1', policy: policy1 },
        { id: 'agent-2', tokenId: 143, name: 'Chog #143', policy: policy2 }
      ]
    };

    const runA = runFullMatch(config);
    const runB = runFullMatch(config);

    expect(runA.matchChecksum).toBe(runB.matchChecksum);
    expect(runA.finalScores).toEqual(runB.finalScores);
    expect(runA.events.length).toBe(runB.events.length);

    for (let i = 0; i < runA.events.length; i++) {
      expect(runA.events[i].action.to).toEqual(runB.events[i].action.to);
      expect(runA.events[i].action.type).toBe(runB.events[i].action.type);
      expect(runA.events[i].agentEnergyAfter).toBe(runB.events[i].agentEnergyAfter);
    }
  });

  it('proves different NFT traits produce different action sequences on the same seed', () => {
    const seed = 999123;
    const policyA = compilePolicy(chog1);
    const policyB = compilePolicy(chog1462);

    const matchA = runFullMatch({
      seed,
      rulesVersion: 'v1.0',
      gridWidth: 10,
      gridHeight: 10,
      maxTurns: 30,
      agents: [{ id: 'solo', tokenId: 1, name: 'Chog #1', policy: policyA }]
    });

    const matchB = runFullMatch({
      seed,
      rulesVersion: 'v1.0',
      gridWidth: 10,
      gridHeight: 10,
      maxTurns: 30,
      agents: [{ id: 'solo', tokenId: 1462, name: 'Chog #1462', policy: policyB }]
    });

    // Checksums and action sequences must differ
    expect(matchA.matchChecksum).not.toBe(matchB.matchChecksum);

    // Verify at least one action differs in path or type
    let foundDifference = false;
    const minLen = Math.min(matchA.events.length, matchB.events.length);
    for (let i = 0; i < minLen; i++) {
      const a = matchA.events[i].action;
      const b = matchB.events[i].action;
      if (a.to.x !== b.to.x || a.to.y !== b.to.y || a.type !== b.type) {
        foundDifference = true;
        break;
      }
    }
    expect(foundDifference).toBe(true);
  });

  it('Trait Lab: detects exact first divergent turn when changing a single parameter', () => {
    const seed = 555777;
    const baseChog = JSON.parse(JSON.stringify(chog143));

    // Baseline policy (Side: Right)
    const policyRight = compilePolicy(baseChog);

    // Modified Chog with single changed trait: Side: Left
    const modifiedChog = JSON.parse(JSON.stringify(baseChog));
    const sideAttr = modifiedChog.attributes.find((a: any) => a.trait_type === 'Side');
    if (sideAttr) sideAttr.value = 'Left';
    const policyLeft = compilePolicy(modifiedChog);

    expect(policyRight.tiebreaker).toBe('clockwise');
    expect(policyLeft.tiebreaker).toBe('counter-clockwise');

    const runRight = runFullMatch({
      seed,
      rulesVersion: 'v1.0',
      gridWidth: 10,
      gridHeight: 10,
      maxTurns: 30,
      agents: [{ id: 'p1', tokenId: 143, name: 'Right Bias', policy: policyRight }]
    });

    const runLeft = runFullMatch({
      seed,
      rulesVersion: 'v1.0',
      gridWidth: 10,
      gridHeight: 10,
      maxTurns: 30,
      agents: [{ id: 'p1', tokenId: 143, name: 'Left Bias', policy: policyLeft }]
    });

    // Find the first diverging turn
    let divergentTurn = -1;
    const maxEvents = Math.max(runRight.events.length, runLeft.events.length);
    for (let i = 0; i < maxEvents; i++) {
      const evR = runRight.events[i];
      const evL = runLeft.events[i];
      if (!evR || !evL || evR.action.to.x !== evL.action.to.x || evR.action.to.y !== evL.action.to.y) {
        divergentTurn = evR ? evR.turn : (evL ? evL.turn : 1);
        break;
      }
    }

    expect(divergentTurn).toBeGreaterThan(0);
    expect(divergentTurn).toBeLessThanOrEqual(30);
  });

  it('compiles traits strictly according to trait-map with explicit tradeoffs', () => {
    const policy = compilePolicy(chog1462);

    expect(policy.derivedBreakdown.length).toBeGreaterThan(0);
    for (const item of policy.derivedBreakdown) {
      expect(item.traitType).toBeDefined();
      expect(item.nativeValue).toBeDefined();
      expect(item.derivedParam).toBeDefined();
      expect(item.gameEffect).toBeDefined();
      expect(item.tradeoff).toBeDefined();
    }

    // Verify low-variance traits are NOT in the derived breakdown
    const traitTypes = policy.derivedBreakdown.map(d => d.traitType);
    expect(traitTypes).not.toContain('Base');
    expect(traitTypes).not.toContain('Form');
    expect(traitTypes).not.toContain('Naked');
  });
});
