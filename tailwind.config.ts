import type { Config } from "tailwindcss"
import typography from "@tailwindcss/typography"

export default {
  darkMode: "class",
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: { extend: {} },
  plugins: [typography],
} satisfies Config
