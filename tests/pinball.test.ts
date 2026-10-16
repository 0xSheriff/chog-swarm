import { describe, it, expect } from 'vitest';
import { runValidationSuite } from '../scripts/run-pinball-validation';

describe('Pinball Table Layout & Physics Validation', () => {
  it('passes all headless validation criteria from table-layout.json', async () => {
    const report = await runValidationSuite();

    // 1. No collider overlap
    expect(report.colliderOverlapPassed).toBe(true);

    // 2. Ball roll time from top to flippers in [1.2, 1.8] seconds
    expect(report.topToFlipperFallTimeSec).toBeGreaterThanOrEqual(1.2);
    expect(report.topToFlipperFallTimeSec).toBeLessThanOrEqual(1.8);

    // 3. Full plunger launch carries ball around arch to playfield
    expect(report.plungerReachesPlayfield).toBe(true);
    expect(report.plungerMinY).toBeLessThan(0.10);

    // 4. Timed flipper shot can reach the top arch (y <= 0.20)
    expect(report.flipperReachesTopArch).toBe(true);
    expect(report.flipperMinY).toBeLessThanOrEqual(0.20);
  });
});
