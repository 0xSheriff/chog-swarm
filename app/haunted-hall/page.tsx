/**
 * /haunted-hall — Coming-soon placeholder for the Haunted Hall codex.
 */
export default function HauntedHallPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
      <div className="text-7xl select-none" aria-hidden>👻</div>
      <h1 className="font-koulen text-4xl text-white tracking-wide">Haunted Hall</h1>
      <p className="text-chog-muted text-lg max-w-md">
        Your personal codex of banished Ghost Chogs. Each rare Chog you knock off the table
        3 times is sealed here — with its real art, traits, and the points you scored.
      </p>
      <span className="px-4 py-2 rounded-full bg-chog-purple/20 border border-chog-purple/40 text-chog-purple text-sm font-mono">
        Coming after Gate 1
      </span>
    </div>
  );
}
