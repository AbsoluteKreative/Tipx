'use client'

import { ConnectButton } from '@rainbow-me/rainbowkit'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Header() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.06] bg-[#09090b]/80 backdrop-blur-xl">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 sm:gap-2.5 group">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-aurora-coral to-aurora-purple flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-lg shadow-aurora-coral/20">
            T
          </div>
          <span className="text-base sm:text-lg font-bold text-white tracking-tight">
            TipX
          </span>
        </Link>

        <nav className="flex items-center gap-3 sm:gap-6">
          <Link
            href="/profile"
            className={`text-xs sm:text-sm font-medium transition-colors hidden sm:block ${
              pathname === '/profile'
                ? 'text-white'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            dashboard
          </Link>

          {/* mobile dashboard icon */}
          <Link
            href="/profile"
            className={`sm:hidden transition-colors ${
              pathname === '/profile' ? 'text-white' : 'text-zinc-500'
            }`}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </Link>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          <div className="flex items-center gap-1.5 sm:gap-2">
            <ConnectButton
              chainStatus="none"
              showBalance={false}
              accountStatus="avatar"
              label="connect"
            />
          </div>
        </nav>
      </div>
    </header>
  )
}
