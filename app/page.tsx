'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CREATORS } from '@/lib/creators'
import { getENSAvatar } from '@/lib/ens'

export default function Home() {
  const router = useRouter()
  const [ensInput, setEnsInput] = useState('')
  const [resolving, setResolving] = useState(false)
  const [avatars, setAvatars] = useState<Record<string, string>>({})

  useEffect(() => {
    const initial: Record<string, string> = {}
    for (const c of CREATORS) {
      if (c.avatar) initial[c.id] = c.avatar
    }
    setAvatars(initial)

    CREATORS.filter((c) => !c.avatar && c.ensName).forEach((c) => {
      getENSAvatar(c.ensName).then((url) => {
        if (url) setAvatars((prev) => ({ ...prev, [c.id]: url }))
      })
    })
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const name = ensInput.trim().toLowerCase()
    if (!name) return
    const ensName = name.endsWith('.eth') ? name : `${name}.eth`
    setResolving(true)
    router.push(`/creator/${encodeURIComponent(ensName)}`)
  }

  return (
    <div>
      {/* hero */}
      <div className="text-center pt-6 sm:pt-8 pb-12 sm:pb-16">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight mb-4">
          <span className="gradient-text">support creators</span>
          <br />
          <span className="text-white">from any chain</span>
        </h1>
        <p className="text-zinc-400 text-base sm:text-lg max-w-sm sm:max-w-md mx-auto mb-8 sm:mb-10 leading-relaxed">
          tip anyone with an ENS name, in USDC.
          <br className="hidden sm:block" />
          direct on-chain or cross-chain bridge.
        </p>

        {/* search bar */}
        <form onSubmit={handleSearch} className="max-w-lg mx-auto">
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-aurora-coral/20 via-aurora-purple/20 to-aurora-blue/20 rounded-2xl blur-sm opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
            <div className="relative flex gap-2 glass-card-static p-2">
              <input
                type="text"
                placeholder="type any ENS name — e.g. vitalik.eth"
                value={ensInput}
                onChange={(e) => setEnsInput(e.target.value)}
                className="flex-1 px-4 py-3 bg-transparent text-white placeholder-zinc-600 focus:outline-none text-sm"
              />
              <button
                type="submit"
                disabled={!ensInput.trim() || resolving}
                className="btn-primary px-6 py-3 whitespace-nowrap"
              >
                {resolving ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    resolving
                  </span>
                ) : (
                  'search'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* divider */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <span className="text-zinc-600 text-xs font-medium uppercase tracking-widest">creators</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      {/* creator grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-16">
        {CREATORS.map((creator) => (
          <Link
            key={creator.id}
            href={`/creator/${creator.id}`}
            className="glass-card group p-5 block"
          >
            <div className="flex items-center gap-3.5 mb-3">
              {avatars[creator.id] ? (
                <div className="avatar-ring group-hover:shadow-lg group-hover:shadow-aurora-coral/10 transition-shadow">
                  <img
                    src={avatars[creator.id]}
                    alt=""
                    className="avatar-ring-inner w-11 h-11 object-cover"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-base font-semibold text-zinc-400">
                  {creator.ensName[0]}
                </div>
              )}
              <div className="min-w-0">
                <div className="font-semibold text-white text-sm truncate group-hover:gradient-text-warm transition-all">
                  {creator.ensName}
                </div>
              </div>
            </div>
            {creator.description && (
              <p className="text-zinc-500 text-sm leading-relaxed line-clamp-2">
                {creator.description}
              </p>
            )}

            {/* hover arrow */}
            <div className="mt-3 flex items-center gap-1 text-xs text-zinc-600 group-hover:text-aurora-coral transition-colors">
              <span>support</span>
              <svg className="w-3 h-3 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      {/* how it works */}
      <div className="flex items-center gap-4 mb-8">
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
        <span className="text-zinc-600 text-xs font-medium uppercase tracking-widest">how it works</span>
        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-aurora-emerald/10 flex items-center justify-center">
            <span className="text-aurora-emerald text-lg font-bold">1</span>
          </div>
          <div className="text-sm font-medium text-white mb-1">pick a creator</div>
          <p className="text-zinc-600 text-xs leading-relaxed">search any ENS name or browse the directory</p>
        </div>
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-aurora-purple/10 flex items-center justify-center">
            <span className="text-aurora-purple text-lg font-bold">2</span>
          </div>
          <div className="text-sm font-medium text-white mb-1">choose your chain</div>
          <p className="text-zinc-600 text-xs leading-relaxed">tip directly on Arbitrum or bridge from another chain</p>
        </div>
        <div className="text-center">
          <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-aurora-amber/10 flex items-center justify-center">
            <span className="text-aurora-amber text-lg font-bold">3</span>
          </div>
          <div className="text-sm font-medium text-white mb-1">earn rewards</div>
          <p className="text-zinc-600 text-xs leading-relaxed">every 3rd tip unlocks cashback for you and a bonus for the creator</p>
        </div>
      </div>
    </div>
  )
}
