import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg:          "var(--bg)",
        surface:     "var(--surface)",
        "surface-2": "var(--surface-2)",
        "surface-3": "var(--surface-3)",
        border:      "var(--border)",
        "border-2":  "var(--border-2)",
        text:        "var(--text)",
        muted:       "var(--muted)",
        "muted-2":   "var(--muted-2)",
        accent:      "var(--accent)",
        pos:         "var(--pos)",
        neg:         "var(--neg)",
        warn:        "var(--warn)",
        /* Groww brand colors */
        "groww-green":  "var(--groww-green)",
        "groww-red":    "var(--groww-red)",
        "groww-purple": "var(--groww-purple)",
        "groww-blue":   "var(--groww-blue)",
        "groww-orange": "var(--groww-orange)",
        "groww-pink":   "var(--groww-pink)",
        "groww-teal":   "var(--groww-teal)",
        "groww-yellow": "var(--groww-yellow)",
        "groww-indigo": "var(--groww-indigo)",
        "groww-coral":  "var(--groww-coral)",
        /* chart color aliases */
        "chart-1": "var(--groww-purple)",
        "chart-2": "var(--groww-green)",
        "chart-3": "var(--groww-orange)",
        "chart-4": "var(--groww-blue)",
        "chart-5": "var(--groww-red)",
        "chart-6": "var(--groww-yellow)",
      },
      fontFamily: {
        display: ["var(--font-display)", "Inter", "ui-sans-serif", "system-ui"],
        sans:    ["var(--font-sans)",    "Inter", "ui-sans-serif", "system-ui"],
        mono:    ["var(--font-mono)",    "IBM Plex Mono", "ui-monospace", "monospace"],
      },
      borderRadius: {
        "2xl": "1rem",
        "3xl": "1.5rem",
      },
      boxShadow: {
        glow:         "0 0 0 1px var(--border), 0 0 32px -8px var(--groww-purple)",
        "glow-green": "0 0 24px -6px var(--groww-green)",
        card:         "0 0 0 1px var(--border), 0 4px 16px -4px rgba(0,0,0,0.15)",
        "card-hover": "0 0 0 1px var(--border-2), 0 8px 32px -8px rgba(103,71,245,0.15)",
        "inset-top":  "inset 0 1px 0 var(--border-2)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        "slide-in-left": {
          from: { opacity: "0", transform: "translateX(-10px)" },
          to:   { opacity: "1", transform: "translateX(0)" },
        },
        pulse_dot: {
          "0%,100%": { opacity: "1",   transform: "scale(1)" },
          "50%":     { opacity: "0.4", transform: "scale(0.85)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "fade-up":       "fade-up 0.45s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in":       "fade-in 0.35s ease both",
        "slide-in-left": "slide-in-left 0.4s cubic-bezier(0.16,1,0.3,1) both",
        "pulse-dot":     "pulse_dot 2s ease-in-out infinite",
        shimmer:         "shimmer 2s linear infinite",
      },
      backgroundImage: {
        "gradient-purple-blue":  "linear-gradient(135deg, var(--groww-purple) 0%, var(--groww-blue) 100%)",
        "gradient-green-teal":   "linear-gradient(135deg, var(--groww-green) 0%, var(--groww-teal) 100%)",
        "gradient-orange-coral": "linear-gradient(135deg, var(--groww-orange) 0%, var(--groww-coral) 100%)",
      },
    },
  },
  plugins: [],
};

export default config;
