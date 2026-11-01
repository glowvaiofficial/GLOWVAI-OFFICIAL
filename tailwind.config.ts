import type { Config } from 'tailwindcss';

const config: Config = {
  future: { hoverOnlyWhenSupported: true },
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1447E6",
          dark: "#0F37B8",
          light: "#3B6AF0",
        },
        coral: {
          DEFAULT: "#1447E6",
          hover: "#0F37B8",
          light: "#3B6AF0",
        },
        yellow: {
          DEFAULT: '#E5DCC9',
          hover: '#D8CDB6',
        },
        skymist: "#EEF3FF",
        blush: "#F7F9FF",
        mint: "#D9F7EA",
        "mint-scan": "#7CF5C8",
        ink: {
          DEFAULT: "#071B4D",
          muted: "#455471",
          light: "#63708A",
          subtle: "#F7F9FF",
        },
        paper: {
          DEFAULT: "#F7F9FF",
          deep: "#EEF3FF",
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'Roboto Mono', 'monospace'],
        sans: ['var(--font-body)', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '10px',
        '3xl': '24px',
        '4xl': '24px',
      },
      boxShadow: {
        card: "0 1px 2px rgba(10,27,77,.06)",
        "card-hover": "0 8px 24px rgba(10,27,77,.10)",
        glow: "0 8px 24px rgba(10,27,77,.10)",
        "coral-glow": "0 8px 24px rgba(10,27,77,.10)",
        phone: "0 24px 56px rgba(10,27,77,.18)",
      },
      animation: {
        'float': 'float 6s ease-in-out infinite',
        'float-delayed': 'float 6s ease-in-out 3s infinite',
        'spin-slow': 'spin 20s linear infinite',
        'marquee': 'marquee 25s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-6px) rotate(0.5deg)' },
        },
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
