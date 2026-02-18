'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { WagmiProvider } from 'wagmi'
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { baseSepolia, sepolia } from 'viem/chains'
import '@rainbow-me/rainbowkit/styles.css'
import { arbitrumSepolia, arcTestnet } from '@/lib/config'

const queryClient = new QueryClient()

// lazy-init wagmi config — getDefaultConfig throws during SSR if projectId is empty
let _wagmiConfig: ReturnType<typeof getDefaultConfig> | null = null
function getWagmiConfig() {
  if (!_wagmiConfig) {
    _wagmiConfig = getDefaultConfig({
      appName: 'TipX',
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'placeholder',
      chains: [arbitrumSepolia, baseSepolia, sepolia, arcTestnet],
    })
  }
  return _wagmiConfig
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // during SSR/static generation, don't render children at all —
  // child components use wagmi hooks which need providers to exist
  if (!mounted) return <div className="min-h-screen bg-[#0a0a0a]" />

  return (
    <WagmiProvider config={getWagmiConfig()}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
