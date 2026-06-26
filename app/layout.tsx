import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Reparatie- / storingsformulier",
  description: "Digitaal storingsformulier — Elmar Services | Rovast",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl">
      <body className="min-h-screen bg-[#eef1f5] text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
