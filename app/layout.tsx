import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TourBoost - Viator Listing Optimization & Analytics",
  description: "AI-powered listing analysis that compares your tour against top competitors. Get a score, see gaps, and get specific recommendations to increase bookings.",
  keywords: ["Viator", "tour operator", "OTA analytics", "listing optimization", "competitor analysis"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${jetbrains.variable}`}>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
