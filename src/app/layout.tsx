import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/layout/Sidebar";
import { MusicProvider } from "@/components/layout/MusicProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Alavanca Synapse | Orquestração de Agentes",
  description:
    "Esteira de agentes de IA da Alavanca AI: mineração, autópsia de concorrente, copy, design e tráfego pago em tempo real.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-[#0F0F13] text-[#F1F1F3] antialiased`}>
        {/* MusicProvider envolve tudo: o <audio> precisa sobreviver à troca de
            rota, senão a música corta ao sair da Visão Geral. */}
        <MusicProvider>
          <Sidebar />
          <main className="ml-[240px] min-h-screen p-8">
            {children}
          </main>
        </MusicProvider>
      </body>
    </html>
  );
}
