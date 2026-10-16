import fs from 'fs';
import path from 'path';
import { Firestore } from '@google-cloud/firestore';
import { FORBIDDEN_PLAYER_ADDRESSES } from '@/lib/constants';

export interface LeaderboardEntry {
  id: string;
  rank?: number;
  playerAddress: string;
  tokenId: number;
  chogName: string;
  score: number;
  finishTurn?: number;
  hasFinished?: boolean;
  seed: number;
  turnsPlayed: number;
  matchChecksum: string;
  timestamp: number;
  dateKey: string; // YYYY-MM-DD
}

const DB_FILE = path.resolve(process.cwd(), 'data/leaderboard.json');

// Initialize Firestore if credentials / environment are present
let firestoreDb: Firestore | null = null;
try {
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
  if (projectId || process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.FIRESTORE_EMULATOR_HOST) {
    firestoreDb = new Firestore({
      projectId: projectId || undefined,
    });
  }
} catch (e) {
  firestoreDb = null;
}

export function isForbiddenPlayer(address: string): boolean {
  if (!address) return true;
  return FORBIDDEN_PLAYER_ADDRESSES.has(address.toLowerCase());
}

function readLocalDb(): LeaderboardEntry[] {
  if (!fs.existsSync(DB_FILE)) {
    fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
    return [];
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed: LeaderboardEntry[] = JSON.parse(raw);
    // Sanitize: strip any seeded or forbidden contract addresses
    return parsed.filter(e => !isForbiddenPlayer(e.playerAddress));
  } catch (_) {
    return [];
  }
}

function writeLocalDb(entries: LeaderboardEntry[]): void {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(entries, null, 2));
}

export function getTodayUtcKey(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

export function getDailySeed(dateKey = getTodayUtcKey()): number {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash << 5) - hash + dateKey.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) || 20261015;
}

export async function getDailyLeaderboard(dateKey = getTodayUtcKey()): Promise<LeaderboardEntry[]> {
  if (firestoreDb) {
    try {
      const snapshot = await firestoreDb
        .collection('daily_leaderboards')
        .where('dateKey', '==', dateKey)
        .orderBy('score', 'desc')
        .orderBy('timestamp', 'asc')
        .limit(100)
        .get();

      const results: LeaderboardEntry[] = [];
      snapshot.forEach(doc => {
        const data = doc.data() as LeaderboardEntry;
        if (!isForbiddenPlayer(data.playerAddress)) {
          results.push({ ...data, id: doc.id });
        }
      });

      return results.map((e, idx) => ({ ...e, rank: idx + 1 }));
    } catch (err) {
      console.warn('Firestore query failed, falling back to local persistent disk store:', (err as Error).message);
    }
  }

  // Persistent disk fallback (survives restarts)
  const all = readLocalDb();
  const filtered = all.filter(e => e.dateKey === dateKey && !isForbiddenPlayer(e.playerAddress));
  filtered.sort((a, b) => {
    const aFin = a.hasFinished || (a.finishTurn !== undefined && a.finishTurn > 0);
    const bFin = b.hasFinished || (b.finishTurn !== undefined && b.finishTurn > 0);
    if (aFin && bFin) {
      if ((a.finishTurn || 0) !== (b.finishTurn || 0)) {
        return (a.finishTurn || 0) - (b.finishTurn || 0); // Earliest finish turn wins
      }
      return b.score - a.score;
    }
    if (aFin) return -1;
    if (bFin) return 1;
    return b.score - a.score || a.timestamp - b.timestamp;
  });
  return filtered.map((e, idx) => ({ ...e, rank: idx + 1 }));
}

export async function recordVerifiedScore(entry: Omit<LeaderboardEntry, 'id' | 'rank'>): Promise<LeaderboardEntry> {
  if (isForbiddenPlayer(entry.playerAddress)) {
    throw new Error('Contract address cannot participate as a player.');
  }

  const id = `entry-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const newEntry: LeaderboardEntry = { id, ...entry };

  // Write to Firestore if configured
  if (firestoreDb) {
    try {
      await firestoreDb.collection('daily_leaderboards').doc(id).set(newEntry);
    } catch (err) {
      console.warn('Firestore write failed, writing to local disk store:', (err as Error).message);
    }
  }

  // Always write to local persistent disk store so restarts never lose verified data
  const all = readLocalDb();
  all.push(newEntry);
  writeLocalDb(all);

  return newEntry;
}
