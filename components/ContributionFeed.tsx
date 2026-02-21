'use client'

import { useEffect, useState } from 'react'
import { usePublicClient } from 'wagmi'
import { parseAbiItem } from 'viem'
import { VAULT_ADDRESS, arbitrumSepolia } from '@/lib/config'

interface ContributionEvent {
  patron: string
  creator: string
  amount: bigint
  creatorShare: bigint
  protocolFee: bigint
  timestamp: bigint
  txHash: string
}

interface ContributionFeedProps {
  creatorAddress?: string
  refreshKey?: number
}

export function ContributionFeed({ creatorAddress, refreshKey }: ContributionFeedProps) {
  const publicClient = usePublicClient({ chainId: arbitrumSepolia.id })
  const [contributions, setContributions] = useState<ContributionEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!publicClient || !VAULT_ADDRESS || VAULT_ADDRESS === '0x') {
      setLoading(false)
      return
    }

    const fetchEvents = async () => {
      // small delay on refresh to let RPC index the new tx
      if (refreshKey && refreshKey > 0) {
        await new Promise(r => setTimeout(r, 2000))
      }
      try {
        const currentBlock = await publicClient.getBlockNumber()
        const fromBlock = currentBlock > BigInt(9000) ? currentBlock - BigInt(9000) : BigInt(0)

        const logs = await publicClient.getLogs({
          address: VAULT_ADDRESS,
          event: parseAbiItem(
            'event ContributionReceived(address indexed patron, address indexed creator, uint256 amount, uint256 creatorShare, uint256 protocolFee, uint256 timestamp)'
          ),
          args: creatorAddress ? { creator: creatorAddress as `0x${string}` } : undefined,
          fromBlock,
          toBlock: 'latest',
        })

        const parsed = logs.map((log) => ({
          patron: log.args.patron!,
          creator: log.args.creator!,
          amount: log.args.amount!,
          creatorShare: log.args.creatorShare!,
          protocolFee: log.args.protocolFee!,
          timestamp: log.args.timestamp!,
          txHash: log.transactionHash,
        }))

        setContributions(parsed.reverse())
      } catch (err) {
        console.error('failed to fetch contribution events:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [publicClient, creatorAddress, refreshKey])

  if (loading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-8 shimmer rounded-lg" />
        ))}
      </div>
    )
  }

  if (!contributions.length) {
    return (
      <div className="text-center py-6">
        <div className="text-zinc-600 text-sm">no contributions yet. be the first!</div>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {contributions.slice(0, 20).map((c, i) => {
        const amountUsdc = Number(c.amount) / 1e6
        return (
          <div key={i} className="flex items-center text-sm gap-3 py-1.5 px-2 -mx-2 rounded-lg hover:bg-white/[0.02] transition-colors">
            <span className="text-zinc-500 font-mono text-xs flex-1">
              {c.patron.slice(0, 6)}...{c.patron.slice(-4)}
            </span>
            <span className="text-zinc-600 text-xs">
              {new Date(Number(c.timestamp) * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-aurora-emerald font-medium w-20 text-right">${amountUsdc.toFixed(2)}</span>
            <a
              href={`https://sepolia.arbiscan.io/tx/${c.txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-700 hover:text-zinc-400 text-xs transition-colors"
            >
              tx &rarr;
            </a>
          </div>
        )
      })}
    </div>
  )
}
