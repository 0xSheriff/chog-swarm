/**
 * /daily-haunting — Coming-soon placeholder for Daily Haunting mode.
 * Gate 1 builds /play. This route is a stub.
 */
export default function DailyHauntingPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
      <div className="text-7xl select-none" aria-hidden>🕯️</div>
      <h1 className="font-koulen text-4xl text-white tracking-wide">Daily Haunting</h1>
      <p className="text-chog-muted text-lg max-w-md">
        Each UTC day a seed selects 4 rare Chog ghosts and one table modifier.
        Score as high as possible — your run is replayed server-side to verify it.
      </p>
      <span className="px-4 py-2 rounded-full bg-chog-purple/20 border border-chog-purple/40 text-chog-purple text-sm font-mono">
        Coming after Gate 1
      </span>
    </div>
  );
}
