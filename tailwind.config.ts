import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0F0F13", // Base background (Level 0)
        surface: "#1A1A24",    // Level 1 surfaces
        "surface-elevated": "#2A2A38", // Level 2 surfaces and borders
        primary: "#6366F1",    // Primary Indigo action color
        "primary-hover": "#4f46e5", // Hover state for primary
        "on-primary": "#ffffff",
        secondary: "#8B8BA0",  // Desaturated slate-gray for text
        "text-primary": "#F1F1F3", // High contrast text
        status: {
          green: "#10b981", // Success / Within goal
          yellow: "#f59e0b", // Warning
          red: "#ef4444" // Error
        }
      },
      fontFamily: {
        inter: ["Inter", "sans-serif"],
      },
      borderRadius: {
        sm: "0.25rem",
        md: "0.5rem", // 8px
        DEFAULT: "0.75rem", // 12px for primary containers
        lg: "1rem",
      }
    },
  },
  plugins: [],
};
export default config;
