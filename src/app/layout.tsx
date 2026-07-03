import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ostuarved",
  description: "Ostuarvete haldamine",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="et">
      <body>{children}</body>
    </html>
  );
}
