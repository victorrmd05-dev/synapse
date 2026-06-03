import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MetaScale | ADS Cockpit v1.0",
  description: "Gerencie e escale suas operações de tráfego pago em tempo real",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0F0F13] text-[#F1F1F3] antialiased`}>
        <Sidebar />
        <main className="ml-[240px] min-h-screen p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
