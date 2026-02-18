import type { Metadata } from 'next'
import { WalletProvider } from '@/components/WalletProvider'
import { Header } from '@/components/Header'
import './globals.css'

export const metadata: Metadata = {
  title: 'TipX — universal tipping',
  description: 'support any creator, from any chain, in USDC',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <WalletProvider>
          <Header />
          <main className="relative z-10 max-w-5xl mx-auto px-6 py-10 flex-1 w-full">
            {children}
          </main>
          <footer className="relative z-10 border-t border-white/[0.04] mt-auto">
            <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded bg-gradient-to-br from-aurora-coral to-aurora-purple flex items-center justify-center text-white font-bold text-[8px]">
                  T
                </div>
                <span className="text-zinc-700 text-xs">TipX</span>
              </div>
              <div className="flex items-center gap-4 text-zinc-700 text-xs">
                <span>universal tipping in USDC</span>
                <span className="hidden sm:inline">·</span>
                <span className="hidden sm:inline">Arbitrum · ENS</span>
              </div>
            </div>
          </footer>
        </WalletProvider>
      </body>
    </html>
  )
}
