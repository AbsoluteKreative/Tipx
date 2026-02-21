'use client'

import { useState } from 'react'
import { useAccount, useWriteContract, usePublicClient } from 'wagmi'
import { parseUnits } from 'viem'
import { VAULT_ABI, ERC20_ABI } from '@/lib/abi'
import { VAULT_ADDRESS, USDC_ADDRESS, API_URL, arbitrumSepolia } from '@/lib/config'

const PRESET_AMOUNTS = ['1', '2', '5', '10']

interface ContributeFormProps {
  creatorAddress: string
  creatorName?: string
  onSuccess?: () => void
}

export function ContributeForm({ creatorAddress, creatorName, onSuccess }: ContributeFormProps) {
  const { address, isConnected } = useAccount()
  const [amount, setAmount] = useState('')
  const [step, setStep] = useState<'idle' | 'approving' | 'contributing' | 'recording' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')
  const [payout, setPayout] = useState<any>(null)
  const [txHash, setTxHash] = useState<string>('')

  const { writeContractAsync } = useWriteContract()
  const publicClient = usePublicClient({ chainId: arbitrumSepolia.id })

  const handleContribute = async () => {
    if (!address || !amount || parseFloat(amount) <= 0 || !publicClient) return

    setError('')
    try {
      const amountUnits = parseUnits(amount, 6)

      const currentAllowance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: [address, VAULT_ADDRESS],
      })

      if (currentAllowance < amountUnits) {
        setStep('approving')
        const maxApproval = parseUnits('999999', 6)
        const approveHash = await writeContractAsync({
          address: USDC_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [VAULT_ADDRESS, maxApproval],
          chainId: arbitrumSepolia.id,
          gas: BigInt(100000),
        })
        await publicClient.waitForTransactionReceipt({ hash: approveHash })
      }

      setStep('contributing')
      const contributeTx = await writeContractAsync({
        address: VAULT_ADDRESS,
        abi: VAULT_ABI,
        functionName: 'contribute',
        args: [creatorAddress as `0x${string}`, amountUnits],
        chainId: arbitrumSepolia.id,
        gas: BigInt(300000),
      })
      setTxHash(contributeTx)

      setStep('recording')
      const res = await fetch(`${API_URL}/api/contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patron: address,
          creator: creatorAddress,
          amount: amount,
          chain: 'arbitrum',
          txHash: contributeTx,
          creatorName: creatorName || undefined,
        }),
      })
      const data = await res.json()

      if (data.payout?.triggered) {
        setPayout(data.payout)
      }

      setStep('done')
      setAmount('')
      onSuccess?.()
    } catch (err: any) {
      console.error('contribution failed:', err)
      setError(err?.shortMessage || err?.message || 'unknown error')
      setStep('error')
    }
  }

  if (!isConnected) {
    return (
      <div className="text-center py-6">
        <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-aurora-emerald/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-aurora-emerald/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
          </svg>
        </div>
        <p className="text-zinc-500 text-sm">connect wallet to tip on Arbitrum</p>
      </div>
    )
  }

  const isActive = step !== 'idle' && step !== 'done' && step !== 'error'

  return (
    <div className="space-y-4">
      {/* preset amounts */}
      <div className="flex gap-2">
        {PRESET_AMOUNTS.map((preset) => (
          <button
            key={preset}
            onClick={() => setAmount(preset)}
            disabled={isActive}
            className={`amount-chip flex-1 text-center ${amount === preset ? 'active' : ''}`}
          >
            ${preset}
          </button>
        ))}
      </div>

      {/* custom amount + submit */}
      <div className="flex gap-2">
        <input
          type="number"
          placeholder="custom amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="input-base flex-1"
          min="0.01"
          step="0.01"
          disabled={isActive}
        />
        <button
          onClick={handleContribute}
          disabled={!amount || parseFloat(amount) <= 0 || isActive}
          className="btn-emerald whitespace-nowrap"
        >
          {step === 'approving' ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              approving
            </span>
          ) : step === 'contributing' ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              tipping
            </span>
          ) : step === 'recording' ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              recording
            </span>
          ) : (
            <>send tip</>
          )}
        </button>
      </div>

      {/* success */}
      {step === 'done' && (
        <div className="flex items-center gap-2 text-sm text-aurora-emerald bg-aurora-emerald/10 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>tipped {creatorName || 'creator'} successfully!</span>
          {txHash && (
            <a
              href={`https://sepolia.arbiscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline ml-auto text-aurora-emerald/70 hover:text-aurora-emerald"
            >
              view tx &rarr;
            </a>
          )}
        </div>
      )}

      {/* error */}
      {step === 'error' && (
        <div className="text-sm text-aurora-coral bg-aurora-coral/10 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <span>tip failed</span>
            <button onClick={() => setStep('idle')} className="underline ml-auto hover:text-white transition-colors">
              retry
            </button>
          </div>
          {error && <div className="text-xs text-aurora-coral/70 mt-1 break-all">{error}</div>}
        </div>
      )}

      {/* loyalty payout */}
      {payout && (
        <div className="bg-aurora-amber/10 border border-aurora-amber/20 rounded-xl p-4">
          <div className="flex items-center gap-2 text-aurora-amber font-semibold text-sm mb-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
            </svg>
            loyalty payout!
          </div>
          <div className="text-zinc-300 text-sm">
            you got <span className="font-semibold text-aurora-amber">${payout.cashbackAmount.toFixed(4)}</span> USDC cashback
          </div>
          <div className="text-zinc-500 text-xs mt-1">
            {creatorName || 'creator'} got ${payout.bonusAmount.toFixed(4)} USDC bonus
          </div>
        </div>
      )}
    </div>
  )
}
