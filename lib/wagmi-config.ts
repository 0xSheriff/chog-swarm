import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http } from 'wagmi';
import { monadMainnet } from './monad-chain';

export const WALLETCONNECT_PROJECT_ID = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'c04543160a2b8e8f2efae7b31d044fa9';

export const wagmiConfig = getDefaultConfig({
  appName: 'Chog Swarm',
  projectId: WALLETCONNECT_PROJECT_ID,
  chains: [monadMainnet],
  transports: {
    [monadMainnet.id]: http('https://rpc.monad.xyz'),
  },
  ssr: true,
});
