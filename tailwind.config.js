/** @type {import('tailwindcss').Config} */

// 🎨 BRAND: Change 'accent' to your brand color.
// All NativeWind classes using bg-accent, text-accent, border-accent update automatically.
// Also update Theme.accent in lib/theme.ts to match.

module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        background: '#08080a',
        accent: '#a3e635',      // 🎨 BRAND: neon lime green
        surface: '#121214',
        surface2: '#1a1a1f',
        muted: '#6b7280',
      },
    },
  },
  plugins: [],
}
