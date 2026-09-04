import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MiniRemit | Autonomous Celo Payment Agent",
  description: "Always-on stablecoin remittance and payment automation agent for Celo and MiniPay.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#0E1012] text-white selection:bg-[#35D07F] selection:text-black">
        {children}
      </body>
    </html>
  );
}
