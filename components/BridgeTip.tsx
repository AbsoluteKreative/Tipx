'use client'

import { useState } from 'react'
import { useAccount, useWalletClient, useSwitchChain, useWriteContract, usePublicClient } from 'wagmi'
import { baseSepolia } from 'viem/chains'
import { parseUnits } from 'viem'
import { VAULT_ABI, ERC20_ABI } from '@/lib/abi'
import { VAULT_ADDRESS, USDC_ADDRESS, API_URL, arbitrumSepolia, arcTestnet } from '@/lib/config'

const SOURCE_CHAINS = [
  { bridgeId: 'Arc_Testnet', name: 'Arc Testnet', chainId: arcTestnet.id },
  { bridgeId: 'Base_Sepolia', name: 'Base Sepolia', chainId: baseSepolia.id },
]

type Step = 'idle' | 'switching_source' | 'bridging' | 'waiting_attestation' | 'switching_arb' | 'approving' | 'contributing' | 'recording' | 'done' | 'error'

const STEP_LABELS: Record<Step, string> = {
  idle: '',
  switching_source: 'switching to source chain...',
  bridging: 'bridging USDC to Arbitrum...',
  waiting_attestation: 'waiting for attestation (~10-15 min)...',
  switching_arb: 'switching to Arbitrum Sepolia...',
  approving: 'approving USDC spend...',
  contributing: 'sending tip...',
  recording: 'recording tip...',
  done: 'bridge & tip complete!',
  error: 'something went wrong',
}

interface BridgeTipProps {
  creatorAddress: string
  creatorName?: string
  onSuccess?: () => void
}

export function BridgeTip({ creatorAddress, creatorName, onSuccess }: BridgeTipProps) {
  const { address, isConnected, chainId } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()
  const arbPublicClient = usePublicClient({ chainId: arbitrumSepolia.id })

  const [sourceChain, setSourceChain] = useState(SOURCE_CHAINS[0])
  const [amount, setAmount] = useState('')
  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState('')

  const handleBridgeAndContribute = async () => {
    if (!address || !walletClient || !amount || parseFloat(amount) <= 0) return

    setError('')

    try {
      const { BridgeKit } = await import('@circle-fin/bridge-kit')
      const { createAdapterFromProvider } = await import('@circle-fin/adapter-viem-v2')

      if (chainId !== sourceChain.chainId) {
        setStep('switching_source')
        await switchChainAsync({ chainId: sourceChain.chainId })
      }

      setStep('bridging')
      const provider = (walletClient.transport as any)?.value?.provider
        ?? (typeof window !== 'undefined' ? (window as any).ethereum : null)

      if (!provider) throw new Error('no wallet provider found')

      const adapter = await createAdapterFromProvider({ provider })

      const kit = new BridgeKit()

      setStep('waiting_attestation')
      const result = await kit.bridge({
        from: { adapter, chain: sourceChain.bridgeId as any },
        to: { adapter, chain: 'Arbitrum_Sepolia' as any },
        amount: amount,
      })

      if (result.state !== 'success') {
        const detail = (result as any)?.error?.message || (result as any)?.message || JSON.stringify(result)
        throw new Error(`bridge ${result.state}: ${detail}`)
      }

      setStep('switching_arb')
      await switchChainAsync({ chainId: arbitrumSepolia.id })

      const amountUnits = parseUnits(amount, 6)

      if (arbPublicClient) {
        const currentAllowance = await arbPublicClient.readContract({
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
          await arbPublicClient.waitForTransactionReceipt({ hash: approveHash })
        }
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

      setStep('recording')
      await fetch(`${API_URL}/api/contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patron: address,
          creator: creatorAddress,
          amount,
          chain: 'bridge',
          txHash: contributeTx,
          creatorName: creatorName || undefined,
        }),
      })

      setStep('done')
      setAmount('')
      onSuccess?.()
    } catch (err: any) {
      console.error('bridge & contribute failed:', err)
      const msg = err?.shortMessage || err?.message || 'unknown error'
      setError(msg.length > 300 ? msg.slice(0, 300) + '...' : msg)
      setStep('error')
    }
  }

  if (!isConnected) return null

  const isActive = step !== 'idle' && step !== 'done' && step !== 'error'

  return (
    <div className="space-y-4">
      <p className="text-zinc-500 text-xs">
        bridge USDC from another chain to Arbitrum via CCTP, then tip
      </p>

      <div className="flex gap-2">
        <select
          value={sourceChain.bridgeId}
          onChange={(e) => setSourceChain(SOURCE_CHAINS.find((c) => c.bridgeId === e.target.value)!)}
          className="input-base w-auto"
          disabled={isActive}
        >
          {SOURCE_CHAINS.map((c) => (
            <option key={c.bridgeId} value={c.bridgeId}>{c.name}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="USDC amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="input-base flex-1"
          min="0.01"
          step="0.01"
          disabled={isActive}
        />
        <button
          onClick={handleBridgeAndContribute}
          disabled={!amount || parseFloat(amount) <= 0 || isActive}
          className="btn-purple whitespace-nowrap"
        >
          bridge & tip
        </button>
      </div>

      {isActive && (
        <div className="flex items-center gap-2 text-sm text-aurora-purple bg-aurora-purple/10 rounded-xl px-4 py-3">
          <span className="w-3.5 h-3.5 border-2 border-aurora-purple/30 border-t-aurora-purple rounded-full animate-spin flex-shrink-0" />
          {STEP_LABELS[step]}
        </div>
      )}

      {step === 'done' && (
        <div className="flex items-center gap-2 text-sm text-aurora-emerald bg-aurora-emerald/10 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          bridged & tipped {creatorName || 'creator'} from {sourceChain.name}!
        </div>
      )}

      {step === 'error' && (
        <div className="text-sm text-aurora-coral bg-aurora-coral/10 rounded-xl px-4 py-3">
          <div className="flex items-center gap-2">
            <span>bridge failed</span>
            <button onClick={() => setStep('idle')} className="underline ml-auto hover:text-white transition-colors">
              retry
            </button>
          </div>
          {error && <div className="text-xs text-aurora-coral/70 mt-1 break-all">{error}</div>}
        </div>
      )}
    </div>
  )
}
