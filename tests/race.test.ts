import { describe, it, expect } from 'vitest';
import {
  compilePolicy,
  runFullMatch,
  buildRaceTrack,
  ArenaConfig
} from '../packages/engine/src';

describe('Race Mode Engine (race-v1)', () => {
  const runnerChog = {
    tokenId: 143,
    name: 'Chog #143',
    attributes: [
      { trait_type: 'Skin', value: 'Red' }, // Sprinter
      { trait_type: 'Eyes', value: 'Laser Eyes' }, // High risk
      { trait_type: 'Aura', value: 'Burning Aura' },
      { trait_type: 'Side', value: 'Right' },
      { trait_type: 'Tier', value: 'Rare' }
    ]
  };

  const safeCruiserChog = {
    tokenId: 24,
    name: 'Chog #24',
    attributes: [
      { trait_type: 'Skin', value: 'Pink' }, // Standard speed
      { trait_type: 'Eyes', value: 'Happy' }, // Safe risk
      { trait_type: 'Aura', value: 'Aqua Aura' },
      { trait_type: 'Side', value: 'Left' },
      { trait_type: 'Tier', value: 'Common' }
    ]
  };

  const coopChog = {
    tokenId: 88,
    name: 'Chog #88',
    attributes: [
      { trait_type: 'Skin', value: 'Origin' },
      { trait_type: 'Eyes', value: 'BTC Glass' },
      { trait_type: 'Aura', value: 'Royal Blue' },
      { trait_type: 'Side', value: 'Right' },
      { trait_type: 'Tier', value: 'Epic' }
    ]
  };

  const policyRunner = compilePolicy(runnerChog);
  const policySafe = compilePolicy(safeCruiserChog);
  const policyCoop = compilePolicy(coopChog);

  it('guarantees pure determinism: identical seed and racers produce identical replay checksum', () => {
    const config: ArenaConfig = {
      seed: 987654,
      rulesVersion: 'race-v1',
      gridWidth: 14,
      gridHeight: 14,
      maxTurns: 35,
      agents: [
        { id: 'Runner', tokenId: 143, name: 'Runner', policy: policyRunner },
        { id: 'Cruiser', tokenId: 24, name: 'Cruiser', policy: policySafe },
        { id: 'Cooperator', tokenId: 88, name: 'Cooperator', policy: policyCoop }
      ]
    };

    const run1 = runFullMatch(config);
    const run2 = runFullMatch(config);

    expect(run1.matchChecksum).toBe(run2.matchChecksum);
    expect(run1.winnerId).toBe(run2.winnerId);
    expect(run1.events.length).toBe(run2.events.length);
    expect(run1.stateHistory.length).toBe(run2.stateHistory.length);

    // Verify step by step equality
    for (let i = 0; i < run1.events.length; i++) {
      expect(run1.events[i].action.to.x).toBe(run2.events[i].action.to.x);
      expect(run1.events[i].action.to.y).toBe(run2.events[i].action.to.y);
      expect(run1.events[i].action.type).toBe(run2.events[i].action.type);
    }
  });

  it('proves trait divergence: changing risk tolerance causes path divergence on the same track', () => {
    // High risk daredevil (takes shortcut)
    const daredevilPolicy = {
      ...policyRunner,
      riskTolerance: 0.90
    };

    // Low risk cruiser (stays on safe outer circuit)
    const cautiousPolicy = {
      ...policyRunner,
      riskTolerance: 0.10
    };

    const configA: ArenaConfig = {
      seed: 444111,
      rulesVersion: 'race-v1',
      gridWidth: 14,
      gridHeight: 14,
      maxTurns: 35,
      agents: [{ id: 'AgentA', tokenId: 143, name: 'Agent', policy: daredevilPolicy }]
    };

    const configB: ArenaConfig = {
      seed: 444111,
      rulesVersion: 'race-v1',
      gridWidth: 14,
      gridHeight: 14,
      maxTurns: 35,
      agents: [{ id: 'AgentB', tokenId: 143, name: 'Agent', policy: cautiousPolicy }]
    };

    const replayA = runFullMatch(configA);
    const replayB = runFullMatch(configB);

    // Replays must diverge once entering the sector with the shortcut
    let hasDiverged = false;
    for (let i = 0; i < Math.min(replayA.events.length, replayB.events.length); i++) {
      const eA = replayA.events[i];
      const eB = replayB.events[i];
      if (eA.action.to.x !== eB.action.to.x || eA.action.to.y !== eB.action.to.y) {
        hasDiverged = true;
        break;
      }
    }

    expect(hasDiverged).toBe(true);
    expect(replayA.matchChecksum).not.toBe(replayB.matchChecksum);
  });

  it('enforces sequential checkpoint ordering (CP1 -> CP2 -> CP3 -> Finish)', () => {
    const config: ArenaConfig = {
      seed: 777222,
      rulesVersion: 'race-v1',
      gridWidth: 14,
      gridHeight: 14,
      maxTurns: 35,
      agents: [
        { id: 'Racer1', tokenId: 143, name: 'Racer 1', policy: policyRunner },
        { id: 'Racer2', tokenId: 24, name: 'Racer 2', policy: policySafe }
      ]
    };

    const replay = runFullMatch(config);
    const finalState = replay.stateHistory[replay.stateHistory.length - 1];

    for (const agent of finalState.agents) {
      if (agent.hasFinished) {
        // Must have cleared all 3 checkpoints before finishing
        expect(agent.checkpointsCleared).toBe(3);
        expect(agent.finishTurn).toBeGreaterThan(0);
      }
    }
  });

  it('verifies track construction integrity with checkpoints and shortcut', () => {
    const track = buildRaceTrack(1337);

    expect(track.circuitWidth).toBe(14);
    expect(track.circuitHeight).toBe(14);
    expect(track.checkpoints.length).toBe(3);
    expect(track.finishLine.length).toBeGreaterThanOrEqual(2);
    expect(track.shortcutTiles.length).toBeGreaterThan(0);
    expect(track.boostPads.length).toBeGreaterThan(0);
    expect(track.oilSlicks.length).toBeGreaterThan(0);
    expect(track.walls.length).toBeGreaterThan(0);
  });
});
