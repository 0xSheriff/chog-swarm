/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        chog: {
          base: '#0E0B1A',
          surface1: '#141026',
          surface2: '#181330',
          card: '#161228',
          purple: '#836EF9',
          purpleSoft: '#A99BFC',
          purpleGlow: 'rgba(131, 110, 249, 0.45)',
          cheek: '#FF6289',
          gold: '#F59E0B',
          line: 'rgba(244, 241, 254, 0.10)',
          lineBright: 'rgba(169, 155, 252, 0.28)',
          text: '#F4F1FE',
          muted: 'rgba(244, 241, 254, 0.65)',
          energy: '#5CE68A',
          hazard: '#EF4444',
          coop: '#22D3EE',
          diverge: '#F43F5E'
        }
      },
      fontFamily: {
        koulen: ['var(--font-koulen)', 'Impact', 'sans-serif'],
        inter: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
        fraunces: ['var(--font-fraunces)', 'Georgia', 'serif']
      }
    }
  },
  plugins: []
};
