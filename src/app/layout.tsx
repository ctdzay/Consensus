import type { Metadata } from "next";
import { Cormorant_Garamond, Outfit } from "next/font/google";
import { BankrollProvider } from "@/components/BankrollProvider";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const sans = Outfit({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "The Consensus — play-money casino",
  description:
    "A private play-money house: Night Orchard slots, Salon Privé blackjack, and a single-zero wheel. No deposits, no cash-out.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${sans.variable} atmosphere font-sans antialiased`}>
        <BankrollProvider>
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </BankrollProvider>
      </body>
    </html>
  );
}
