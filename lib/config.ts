import { defineChain } from 'viem'
import { arbitrumSepolia } from 'viem/chains'

export { arbitrumSepolia }

// Arc Testnet — kept as BridgeKit source chain only
export const arcTestnet = defineChain({
  id: 5042002,
  name: 'Arc Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'USDC',
    symbol: 'USDC',
  },
  rpcUrls: {
    default: {
      http: ['https://rpc.testnet.arc.network'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Arcscan',
      url: 'https://testnet.arcscan.app',
    },
  },
  testnet: true,
})

export const VAULT_ADDRESS = (process.env.NEXT_PUBLIC_VAULT_ADDRESS || '0x') as `0x${string}`
export const USDC_ADDRESS = (process.env.NEXT_PUBLIC_USDC_ADDRESS || '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d') as `0x${string}`
export const PROTOCOL_FEE = parseFloat(process.env.NEXT_PUBLIC_PROTOCOL_FEE_PERCENTAGE || '0.05')
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:7301'
