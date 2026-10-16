/**
 * /how-it-works — Permanent explainer page.
 */
export default function HowItWorksPage() {
  const steps = [
    {
      n: '01',
      title: 'Pick your Chog NFT',
      body: 'Connect your wallet on Monad. The game reads your owned Chog Genesis NFTs on-chain. Choose one — its real traits become your ball\'s physics.',
      icon: '🎱',
    },
    {
      n: '02',
      title: 'Launch & haunt',
      body: 'Use the plunger to launch your Soul Ball. Hit tombstone bumpers, blast Ghost Chogs off the table, and fill up your Haunt Power for a one-time ability.',
      icon: '🔮',
    },
    {
      n: '03',
      title: 'Submit to the leaderboard',
      body: 'When your last ball drains, sign a message with your wallet. The server replays your input log to verify the score, then writes it to the Haunted Hall leaderboard.',
      icon: '🏆',
    },
  ];

  const traitMap = [
    { trait: 'Body', effect: 'Ball mass & top speed' },
    { trait: 'Eyes', effect: 'Ghost-target sense radius' },
    { trait: 'Mouth', effect: 'Combo window length' },
    { trait: 'Aura', effect: 'Bumper effect multiplier' },
    { trait: 'Head', effect: 'Haunt Power ability' },
    { trait: 'Tier', effect: 'Trail & cosmetics only' },
  ];

  return (
    <div className="max-w-3xl mx-auto py-12 px-4 space-y-16">
      {/* Goal */}
      <section className="text-center space-y-4">
        <h1 className="font-koulen text-5xl text-white tracking-wide">How It Works</h1>
        <p className="text-chog-text text-xl leading-relaxed">
          Pinball haunted by real rare Chogs. Launch your own Chog as the ball;
          its on-chain traits change how it plays.
        </p>
      </section>

      {/* 3-step strip */}
      <section>
        <h2 className="text-chog-muted text-xs font-mono uppercase tracking-widest mb-6">3 steps</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div
              key={s.n}
              className="bg-chog-card border border-chog-line rounded-2xl p-6 space-y-3 hover:border-chog-purple/40 transition-colors"
            >
              <div className="text-4xl" aria-hidden>{s.icon}</div>
              <div className="text-chog-muted font-mono text-xs">{s.n}</div>
              <h3 className="text-white font-semibold text-lg">{s.title}</h3>
              <p className="text-chog-muted text-sm leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Trait map */}
      <section>
        <h2 className="text-chog-muted text-xs font-mono uppercase tracking-widest mb-6">Trait → Physics map</h2>
        <div className="bg-chog-card border border-chog-line rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-chog-line text-chog-muted font-mono text-xs uppercase">
                <th className="px-5 py-3 text-left">Trait</th>
                <th className="px-5 py-3 text-left">Gameplay effect</th>
              </tr>
            </thead>
            <tbody>
              {traitMap.map((row, i) => (
                <tr
                  key={row.trait}
                  className={`border-b border-chog-line last:border-0 ${i % 2 === 0 ? '' : 'bg-white/[0.02]'}`}
                >
                  <td className="px-5 py-3 font-mono text-chog-purple">{row.trait}</td>
                  <td className="px-5 py-3 text-chog-text">{row.effect}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-chog-muted text-xs mt-3">
          Every upside has a cost. No trait combination is strictly dominant (verified by 10,000-game simulation).
        </p>
      </section>

      {/* Guest spirit note */}
      <section className="bg-chog-surface1 border border-chog-line rounded-2xl p-6 space-y-2">
        <h3 className="text-white font-semibold">No Chog? No problem.</h3>
        <p className="text-chog-muted text-sm leading-relaxed">
          Anyone can play as a <strong className="text-chog-text">Guest Spirit</strong> — a baseline ball with no traits and no
          powers. You can still enjoy the table, but Guest runs are not eligible
          for the Haunted Hall leaderboard. This is intentional: it's the side-by-side
          demo of why owning a Chog matters.
        </p>
      </section>
    </div>
  );
}
