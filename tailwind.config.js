/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        industrial: {
          bg: '#0F1115', // Pure deep carbon backplane
          card: '#161920', // Rolled steel panel
          border: '#2C3240', // Heavy steel bracket
          accent: '#00F0FF', // Cyber line terminal cyan
          safety: '#FF6B00', // Safety compliance orange
          success: '#10B981', // Compliant running green
          warning: '#FBBF24', // Non-critical caution yellow
          danger: '#EF4444', // Shutdown / Emergency stop red
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Space Grotesk', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
