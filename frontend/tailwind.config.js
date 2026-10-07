/** Portfolio series design system (P01–P07). P07 accent: teal. */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Plus Jakarta Sans"', "Inter", "sans-serif"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        num: ['"JetBrains Mono"', "monospace"],
      },
      colors: { night: "#0B0F17" },
      keyframes: { slideUp: { from: { opacity: "0", transform: "translateY(8px)" }, to: { opacity: "1", transform: "none" } } },
      animation: { "slide-up": "slideUp .35s ease both" },
    },
  },
  plugins: [],
};
