import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: { 50:'#f0f9ff', 100:'#e0f2fe', 300:'#7dd3fc', 500:'#0ea5e9', 600:'#0284c7', 700:'#0369a1' },
        surface: { DEFAULT:'#ffffff', muted:'#f8fafc', border:'#e2e8f0' },
      },
      borderRadius: { card: '0.75rem' },
      screens: { xs: '375px' },
    },
  },
  plugins: [],
};
export default config;
