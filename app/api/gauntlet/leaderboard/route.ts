import { NextRequest, NextResponse } from 'next/server';
import { getDailyLeaderboard, getDailySeed, getTodayUtcKey } from '@/lib/leaderboard-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dateKey = searchParams.get('date') || getTodayUtcKey();
    const leaderboard = await getDailyLeaderboard(dateKey);
    const seed = getDailySeed(dateKey);

    return NextResponse.json({
      dateKey,
      seed,
      entries: leaderboard,
      totalEntries: leaderboard.length,
      rulesVersion: 'v1.0'
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
