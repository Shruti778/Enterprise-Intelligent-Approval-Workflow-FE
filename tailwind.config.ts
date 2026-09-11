import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dae5ff',
          200: '#bcd0ff',
          300: '#8eb0ff',
          400: '#5985ff',
          500: '#335bff',
          600: '#1b38f5',
          700: '#1429e1',
          800: '#1724b6',
          900: '#1a258f',
          950: '#141857',
        },
      },
      boxShadow: {
        card: '0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)',
        panel: '0 10px 30px -12px rgb(15 23 42 / 0.18)',
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
    },
  },
  plugins: [],
};

export default config;
