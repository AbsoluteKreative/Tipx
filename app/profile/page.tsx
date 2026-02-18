'use client'

import { useEffect, useState } from 'react'
import { useAccount } from 'wagmi'
import Link from 'next/link'
import { API_URL } from '@/lib/config'
import { CREATORS } from '@/lib/creators'
import { reverseENS } from '@/lib/ens'

function formatTime(ts: number) {
  const d = new Date(ts * 1000)
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function LoyaltyRing({ count }: { count: number }) {
  const filled = count % 3 || (count > 0 && count % 3 === 0 ? 3 : 0)
  const segments = [0, 1, 2]

  return (
    <div className="flex items-center gap-1">
      {segments.map((i) => (
        <div
          key={i}
          className={`w-2 h-2 rounded-full transition-colors ${
            i < filled
              ? 'bg-aurora-emerald shadow-sm shadow-aurora-emerald/50'
              : 'bg-white/10'
          }`}
        />
      ))}
    </div>
  )
}

export default function ProfilePage() {
  const { address, isConnected } = useAccount()
  const [data, setData] = useState<any>(null)
  const [resolvedNames, setResolvedNames] = useState<Record<string, string>>({})

  useEffect(() => {
    const wallets = [address].filter(Boolean) as string[]
    if (!wallets.length) return

    Promise.all(wallets.map((w) => fetch(`${API_URL}/api/patrons/${w}`).then((r) => r.json())))
      .then(async (results) => {
        const allCreators = results.flatMap((r) => r.creators || [])
        const creatorMap = new Map<string, any>()
        for (const c of allCreators) {
          const match = CREATORS.find((cr) =>
            cr.wallet?.toLowerCase() === c.creator_address.toLowerCase()
          )
          const key = match?.id || c.creator_address.toLowerCase()
          const existing = creatorMap.get(key)
          if (existing) {
            existing.contribution_count += c.contribution_count
            existing.total_amount += c.total_amount
            existing.last_contribution = Math.max(existing.last_contribution, c.last_contribution)
            if (!existing.creator_name && c.creator_name) existing.creator_name = c.creator_name
          } else {
            creatorMap.set(key, { ...c })
          }
        }

        const merged = {
          creators: Array.from(creatorMap.values()),
          recentPayouts: results.flatMap((r) => r.recentPayouts || []),
          recentContributions: results.flatMap((r) => r.recentContributions || [])
            .sort((a: any, b: any) => b.timestamp - a.timestamp)
            .slice(0, 20),
          totalCashback: results.reduce((s, r) => s + (r.totalCashback || 0), 0),
          totalContributed: results.reduce((s, r) => s + (r.totalContributed || 0), 0),
        }
        setData(merged)

        const unknown = merged.creators.filter((c: any) => {
          const known = CREATORS.find((cr) =>
            cr.wallet?.toLowerCase() === c.creator_address.toLowerCase()
          )
          return !known && !c.creator_name && c.creator_address.startsWith('0x') && c.creator_address.length === 42
        })

        if (unknown.length) {
          const names: Record<string, string> = {}
          await Promise.all(unknown.map(async (c: any) => {
            const ens = await reverseENS(c.creator_address)
            if (ens) names[c.creator_address.toLowerCase()] = ens
          }))
          if (Object.keys(names).length) setResolvedNames(names)
        }
      })
      .catch(console.error)
  }, [address])

  if (!isConnected) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-aurora-coral/20 to-aurora-purple/20 flex items-center justify-center">
          <svg className="w-7 h-7 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
          </svg>
        </div>
        <p className="text-zinc-500 text-sm">connect your wallet to view your dashboard</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-8">your dashboard</h1>

      {data ? (
        <>
          {/* summary stats */}
          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="glass-card-static stat-glow p-5">
              <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">total contributed</div>
              <div className="text-3xl font-bold gradient-text-warm">${data.totalContributed?.toFixed(2)}</div>
            </div>
            <div className="glass-card-static stat-glow p-5">
              <div className="text-xs text-zinc-500 font-medium uppercase tracking-wider mb-2">cashback earned</div>
              <div className="text-3xl font-bold text-aurora-emerald">${data.totalCashback?.toFixed(4)}</div>
            </div>
          </div>

          {/* creators */}
          {data.creators?.length > 0 && (
            <div className="glass-card-static p-6 mb-6">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
                your creators
              </h2>
              <div className="space-y-1">
                {data.creators.map((c: any, i: number) => {
                  const creator = CREATORS.find((cr) =>
                    cr.wallet?.toLowerCase() === c.creator_address.toLowerCase()
                  )
                  const displayName = creator?.ensName
                    || resolvedNames[c.creator_address.toLowerCase()]
                    || c.creator_name
                    || `${c.creator_address.slice(0, 8)}...`
                  const untilNextPayout = 3 - (c.contribution_count % 3)

                  const latestPayout = data.recentPayouts?.find((p: any) =>
                    p.creator_address?.toLowerCase() === c.creator_address.toLowerCase()
                  )
                  const payoutExplorerUrl = latestPayout?.tx_hash && (
                    `https://sepolia.arbiscan.io/tx/${latestPayout.tx_hash}`
                  )

                  const linkTarget = creator?.id
                    ? `/creator/${creator.id}`
                    : displayName.endsWith('.eth')
                      ? `/creator/${encodeURIComponent(displayName)}`
                      : null

                  const content = (
                    <>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-white truncate">
                          {displayName}
                        </div>
                        <div className="text-xs text-zinc-600 mt-0.5">
                          {c.contribution_count} {c.contribution_count === 1 ? 'contribution' : 'contributions'} · ${c.total_amount.toFixed(2)} USDC
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                          <span>
                            {untilNextPayout === 3 && c.contribution_count > 0
                              ? 'payout unlocked!'
                              : `${untilNextPayout} to next`}
                          </span>
                          {payoutExplorerUrl && (
                            <a
                              href={payoutExplorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-zinc-700 hover:text-zinc-400 underline transition-colors"
                            >
                              tx
                            </a>
                          )}
                        </div>
                        <LoyaltyRing count={c.contribution_count} />
                      </div>
                    </>
                  )

                  return linkTarget ? (
                    <Link
                      key={i}
                      href={linkTarget}
                      className="flex items-center justify-between py-2.5 px-3 -mx-3 rounded-xl hover:bg-white/[0.03] transition-colors"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div key={i} className="flex items-center justify-between py-2.5 px-3 -mx-3">
                      {content}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* recent tips */}
          {data.recentContributions?.length > 0 && (
            <div className="glass-card-static p-6 mb-6">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
                recent tips
              </h2>
              <div className="space-y-1">
                {data.recentContributions.map((c: any, i: number) => {
                  const creator = CREATORS.find((cr) =>
                    cr.wallet?.toLowerCase() === c.creator_address?.toLowerCase()
                  )
                  const creatorName = creator?.ensName || c.creator_name || c.creator_address?.slice(0, 8) + '...'
                  const creatorLink = creator?.id ? `/creator/${creator.id}` : null
                  const explorerUrl = c.tx_hash && (
                    `https://sepolia.arbiscan.io/tx/${c.tx_hash}`
                  )
                  const chainPill = c.chain === 'bridge' ? 'bg-aurora-purple/15 text-aurora-purple' : 'bg-aurora-emerald/15 text-aurora-emerald'

                  return (
                    <div key={i} className="flex items-center text-sm gap-3 py-1.5 px-2 -mx-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                      {creatorLink ? (
                        <Link href={creatorLink} className="text-zinc-300 hover:text-white truncate flex-1 transition-colors">
                          {creatorName}
                        </Link>
                      ) : (
                        <span className="text-zinc-400 truncate flex-1">{creatorName}</span>
                      )}
                      <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${chainPill}`}>{c.chain}</span>
                      <span className="text-aurora-emerald font-medium whitespace-nowrap">${c.amount.toFixed(2)}</span>
                      <span className="text-zinc-600 text-xs text-right w-28">
                        {formatTime(c.timestamp)}
                      </span>
                      {explorerUrl && (
                        <a
                          href={explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-zinc-700 hover:text-zinc-400 text-xs transition-colors"
                        >
                          tx &rarr;
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* loyalty rewards */}
          {data.recentPayouts?.length > 0 && (
            <div className="glass-card-static p-6">
              <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
                loyalty rewards
              </h2>
              <div className="space-y-1">
                {data.recentPayouts.map((r: any, i: number) => {
                  const creator = CREATORS.find((cr) =>
                    cr.wallet?.toLowerCase() === r.creator_address?.toLowerCase()
                  )
                  const creatorName = creator?.ensName || r.creator_address?.slice(0, 8) + '...'
                  const creatorLink = creator?.id ? `/creator/${creator.id}` : null
                  const explorerUrl = r.tx_hash && (
                    `https://sepolia.arbiscan.io/tx/${r.tx_hash}`
                  )

                  return (
                    <div key={i} className="flex items-center text-sm gap-3 py-1.5 px-2 -mx-2 rounded-lg hover:bg-white/[0.02] transition-colors">
                      {creatorLink ? (
                        <Link href={creatorLink} className="text-zinc-300 hover:text-white truncate flex-1 transition-colors">
                          {creatorName}
                        </Link>
                      ) : (
                        <span className="text-zinc-400 truncate flex-1">{creatorName}</span>
                      )}
                      <span className="text-aurora-amber font-medium whitespace-nowrap">
                        +${r.patron_cashback.toFixed(4)}
                      </span>
                      <span className="text-zinc-600 text-xs text-right w-28">
                        {formatTime(r.timestamp)}
                      </span>
                      {explorerUrl && (
                        <a
                          href={explorerUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-zinc-700 hover:text-zinc-400 text-xs transition-colors"
                        >
                          tx &rarr;
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="glass-card-static p-6">
              <div className="h-6 w-32 shimmer rounded-lg mb-4" />
              <div className="h-10 shimmer rounded-lg" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
