/**
 * Mulberry32: A fast, high-quality 32-bit deterministic PRNG.
 * Produces strictly identical pseudo-random sequences across all platforms and runtimes.
 */
export class DeterministicPRNG {
  private s: number;

  constructor(seed: number) {
    // Normalize to 32-bit uint
    this.s = (Math.floor(seed) >>> 0) || 1337;
  }

  /**
   * Generates next float in range [0, 1)
   */
  next(): number {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates next integer in range [min, max] inclusive
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Deterministically shuffles an array in place (Fisher-Yates)
   */
  shuffle<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }
}
