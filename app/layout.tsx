import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Growth Agents — AI agents for profitable growth",
  description:
    "ProFiQ & RealROI: decision-support agents that make every marketing dollar accountable.",
  metadataBase: new URL("http://localhost:3000"),
  openGraph: {
    title: "Growth Agents — AI agents for profitable growth",
    description:
      "ProFiQ & RealROI: decision-support agents that make every marketing dollar accountable.",
    type: "website",
  },
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} antialiased min-h-screen bg-white text-gray-900`}
      >
        {children}
      </body>
    </html>
  );
}
