import type { Metadata } from 'next';
import './globals.css';
import { Web3Provider } from '@/components/web3-provider';
import { Navbar } from '@/components/navbar';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://chog-swarm.vercel.app'),
  title: 'Chog Swarm | Autonomous Agent Arena on Monad',
  description: 'Pure deterministic autonomous agent arena where your Chog Genesis NFT identity compiles into on-chain policy. Built for Chogathon 2026.',
  keywords: ['Chog', 'Monad', 'NFT', 'Autonomous Agents', 'Game', 'Deterministic Arena', 'Chogathon'],
  authors: [{ name: 'Chog Swarm' }],
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'Chog Swarm | Autonomous Agent Arena on Monad',
    description: 'Autonomous arena game powered by authentic Chog Genesis NFT traits on Monad.',
    url: 'https://chogathon.chog.xyz',
    siteName: 'Chog Swarm',
    images: [
      {
        url: '/og-image.png',
        width: 512,
        height: 512,
        alt: 'Chog Swarm - Autonomous Agent Arena',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Chog Swarm | Autonomous Agent Arena on Monad',
    description: 'Autonomous arena game powered by authentic Chog Genesis NFT traits on Monad.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-chog-base text-chog-text antialiased min-h-screen flex flex-col selection:bg-chog-purple selection:text-white">
        <Web3Provider>
          {/* Ambient background glows */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute top-[-100px] right-[-100px] w-[500px] h-[500px] rounded-full bg-chog-purple/10 blur-[120px]" />
            <div className="absolute bottom-[20%] left-[-150px] w-[450px] h-[450px] rounded-full bg-chog-cheek/8 blur-[130px]" />
          </div>

          <div className="relative z-10 flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 w-full max-w-[1680px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
              {children}
            </main>
            <footer className="w-full border-t border-chog-line py-6 text-center text-xs text-chog-muted">
              <div className="max-w-[1680px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <span>Chog Swarm • Built for Chogathon 2026</span>
                <span className="text-chog-muted">Monad Mainnet • Contract <code className="font-mono text-chog-text">0xc96d...3763</code></span>
              </div>
            </footer>
          </div>
        </Web3Provider>
      </body>
    </html>
  );
}
