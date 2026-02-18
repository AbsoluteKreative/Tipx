'use client'

import { useEffect, useState } from 'react'
import { getENSProfile, type ENSProfile as ENSProfileType } from '@/lib/ens'

interface ENSProfileProps {
  ensName: string
  fallbackDescription?: string
}

export function ENSProfile({ ensName, fallbackDescription }: ENSProfileProps) {
  const [profile, setProfile] = useState<ENSProfileType | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getENSProfile(ensName)
      .then(setProfile)
      .finally(() => setLoading(false))
  }, [ensName])

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gray-700" />
          <div className="space-y-2">
            <div className="h-6 w-32 bg-gray-700 rounded" />
            <div className="h-4 w-24 bg-gray-800 rounded" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-4">
        {profile?.avatar ? (
          <img src={profile.avatar} alt="" className="w-16 h-16 rounded-full" />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-2xl">
            {ensName[0]}
          </div>
        )}
        <div>
          <h2 className="text-2xl font-bold">{ensName}</h2>
          {profile?.address && (
            <div className="text-gray-500 text-xs font-mono">
              {profile.address.slice(0, 6)}...{profile.address.slice(-4)}
            </div>
          )}
        </div>
      </div>

      {(profile?.description || fallbackDescription) && (
        <p className="text-gray-300 mb-3">
          {profile?.description || fallbackDescription}
        </p>
      )}

      <div className="flex gap-3">
        {profile?.twitter && (
          <a
            href={`https://twitter.com/${profile.twitter}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 text-sm hover:underline"
          >
            @{profile.twitter}
          </a>
        )}
        {profile?.url && (
          <a
            href={profile.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-400 text-sm hover:underline"
          >
            {profile.url.replace(/^https?:\/\//, '')}
          </a>
        )}
      </div>
    </div>
  )
}
