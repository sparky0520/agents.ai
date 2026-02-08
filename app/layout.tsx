import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { WalletProvider } from "@/components/wallet/WalletProvider";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  icons: {
    icon: "/favicon.jpg",
  },
  title: "AI Agents Marketplace",
  description: "A minimalist marketplace for AI agents",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body
        className={cn(
          "min-h-screen bg-background font-mono antialiased",
          jetbrainsMono.variable,
        )}
      >
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
