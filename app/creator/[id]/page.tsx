'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { CREATORS } from '@/lib/creators'
import { getENSProfile, type ENSProfile } from '@/lib/ens'
import { TipForm } from '@/components/TipForm'
import { ContributionFeed } from '@/components/ContributionFeed'
import { API_URL } from '@/lib/config'

export default function CreatorPage() {
  const params = useParams()
  const id = decodeURIComponent(params.id as string)

  const creator = CREATORS.find((c) => c.id === id)
  const isEnsLookup = !creator && id.endsWith('.eth')

  const [profile, setProfile] = useState<ENSProfile | null>(null)
  const [ensLoading, setEnsLoading] = useState(isEnsLookup)
  const [stats, setStats] = useState<any>(null)
  const [recentContributions, setRecentContributions] = useState<any[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  const handleContributionSuccess = useCallback(() => {
    setRefreshKey((k) => k + 1)
  }, [])

  useEffect(() => {
    const ensName = creator?.ensName || (isEnsLookup ? id : null)
    if (!ensName) return

    setEnsLoading(true)
    getENSProfile(ensName)
      .then(setProfile)
      .finally(() => setEnsLoading(false))
  }, [creator, id, isEnsLookup])

  const creatorAddress = creator?.wallet || profile?.address || null

  useEffect(() => {
    if (!creatorAddress) return

    fetch(`${API_URL}/api/creators/${creatorAddress}`)
      .then((r) => r.json())
      .then((data) => {
        setStats(data.stats)
        setRecentContributions(data.recentContributions || [])
      })
      .catch(console.error)
  }, [creatorAddress, refreshKey])

  const displayName = creator?.ensName || (isEnsLookup ? id : null)

  if (!creator && !isEnsLookup) {
    return (
      <div className="text-center py-20">
        <div className="text-zinc-500 text-lg">creator not found</div>
      </div>
    )
  }

  if (ensLoading) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="glass-card-static p-8">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full shimmer" />
            <div className="flex-1">
              <div className="h-7 w-48 shimmer rounded-lg mb-3" />
              <div className="h-4 w-32 shimmer rounded-lg" />
            </div>
          </div>
          <div className="mt-6 h-4 w-full shimmer rounded-lg" />
          <div className="mt-3 h-4 w-3/4 shimmer rounded-lg" />
        </div>
      </div>
    )
  }

  if (isEnsLookup && !profile?.address) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="text-6xl mb-4 opacity-30">?</div>
        <div className="text-zinc-400 mb-2">
          could not resolve <span className="text-white font-semibold">{id}</span>
        </div>
        <div className="text-zinc-600 text-sm">make sure the ENS name exists and has an address set</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* profile card */}
      <div className="glass-card-static overflow-hidden mb-6">
        <div className="h-1 bg-gradient-to-r from-aurora-coral via-aurora-purple to-aurora-blue" />
        <div className="p-8">
        <div className="flex items-start gap-5 mb-5">
          {profile?.avatar ? (
            <div className="avatar-ring flex-shrink-0">
              <img src={profile.avatar} alt="" className="avatar-ring-inner w-20 h-20 object-cover" />
            </div>
          ) : (
            <div className="w-[84px] h-[84px] rounded-full bg-gradient-to-br from-aurora-coral/20 to-aurora-purple/20 flex items-center justify-center text-3xl font-bold text-zinc-400 flex-shrink-0">
              {(displayName || '?')[0]}
            </div>
          )}
          <div className="min-w-0 pt-1">
            <h1 className="text-2xl font-bold text-white mb-1 truncate">{displayName}</h1>
            {creatorAddress && (
              <div className="text-zinc-600 text-xs font-mono">
                {creatorAddress.slice(0, 6)}...{creatorAddress.slice(-4)}
              </div>
            )}
          </div>
        </div>

        {(profile?.description || creator?.description) && (
          <p className="text-zinc-400 leading-relaxed mb-4">
            {profile?.description || creator?.description}
          </p>
        )}

        {/* social links */}
        <div className="flex items-center gap-3 mb-5">
          {profile?.twitter && (
            <a
              href={`https://twitter.com/${profile.twitter}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-aurora-blue hover:text-aurora-blue-light transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              @{profile.twitter}
            </a>
          )}
          {profile?.url && (
            <a
              href={profile.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              {profile.url.replace(/^https?:\/\//, '')}
            </a>
          )}
        </div>

        {/* stats row */}
        {stats && (
          <div className="grid grid-cols-3 gap-4 pt-5 border-t border-white/[0.06]">
            <div>
              <div className="text-2xl font-bold text-white">{stats.total_contributions}</div>
              <div className="text-zinc-600 text-xs mt-0.5">contributions</div>
            </div>
            <div>
              <div className="text-2xl font-bold gradient-text-warm">${stats.total_amount?.toFixed(2)}</div>
              <div className="text-zinc-600 text-xs mt-0.5">total USDC</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{stats.unique_patrons}</div>
              <div className="text-zinc-600 text-xs mt-0.5">patrons</div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* tip section */}
      <div className="glass-card-static overflow-hidden mb-6">
        <div className="p-6">
          {creatorAddress ? (
            <TipForm
              creatorAddress={creatorAddress}
              creatorName={displayName || undefined}
              onSuccess={handleContributionSuccess}
            />
          ) : (
            <div className="text-zinc-500 text-sm">resolving ENS name...</div>
          )}
        </div>
      </div>

      {/* contribution history — on-chain */}
      {creatorAddress && (
        <div className="glass-card-static p-6 mb-6">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
            on-chain contributions
          </h2>
          <ContributionFeed creatorAddress={creatorAddress} refreshKey={refreshKey} />
        </div>
      )}

      {/* recent contributions — all chains */}
      {recentContributions.length > 0 && (
        <div className="glass-card-static p-6">
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
            recent activity
          </h2>
          <div className="space-y-2.5">
            {recentContributions.map((c: any, i: number) => {
              const explorerUrl = c.tx_hash && `https://sepolia.arbiscan.io/tx/${c.tx_hash}`
              return (
                <div key={i} className="flex items-center text-sm gap-3 py-1">
                  <span className="text-zinc-500 font-mono text-xs flex-1">
                    {c.patron_address.slice(0, 6)}...{c.patron_address.slice(-4)}
                  </span>
                  <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    c.chain === 'bridge' ? 'bg-aurora-purple/15 text-aurora-purple' :
                    'bg-aurora-emerald/15 text-aurora-emerald'
                  }`}>{c.chain}</span>
                  <span className="text-zinc-600 text-xs w-12 text-right">
                    {new Date(c.timestamp * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-aurora-emerald font-medium w-20 text-right">${c.amount.toFixed(2)}</span>
                  {explorerUrl ? (
                    <a
                      href={explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-zinc-700 hover:text-zinc-400 text-xs transition-colors"
                    >
                      tx &rarr;
                    </a>
                  ) : (
                    <span className="w-6" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
