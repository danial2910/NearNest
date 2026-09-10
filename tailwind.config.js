/** @type {import('tailwindcss').Config} */
module.exports = {
  // Sources live both inside src/ (routes) and at the repo root (shared UI).
  // Both globs are required or NativeWind emits no styles for components/.
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#0E4D92",
        "primary-light": "#5A9BD8",
        accent: "#F59E0B",
        card: "#1A1A2E",
      },
      fontFamily: {
        // Distinct keys so these never collide with Tailwind's font-weight
        // utilities (font-bold / font-semibold), which would win the prefix.
        sans: ["Rubik_400Regular"],
        rubik: ["Rubik_400Regular"],
        "rubik-medium": ["Rubik_500Medium"],
        "rubik-semibold": ["Rubik_600SemiBold"],
        "rubik-bold": ["Rubik_700Bold"],
      },
    },
  },
  plugins: [],
};
