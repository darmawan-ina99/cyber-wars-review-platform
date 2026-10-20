import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CYBER WARS // Review Command Center",
  description:
    "Dynamic Google Review link management platform. Tactical HUD interface.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="cyber-grid min-h-screen bg-obsidian antialiased">
        <div className="scanline" aria-hidden />
        {children}
      </body>
    </html>
  );
}
