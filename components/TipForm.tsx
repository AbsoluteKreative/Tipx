'use client'

import { useState, useEffect } from 'react'
import { useAccount, useWriteContract, usePublicClient, useSwitchChain, useWalletClient } from 'wagmi'
import { baseSepolia } from 'viem/chains'
import { parseUnits } from 'viem'
import { VAULT_ABI, ERC20_ABI } from '@/lib/abi'
import { VAULT_ADDRESS, USDC_ADDRESS, API_URL, arbitrumSepolia, arcTestnet } from '@/lib/config'

const PRESET_AMOUNTS = ['1', '2', '5', '10']

const ROUTES = [
  { id: 'arbitrum', label: 'Arbitrum', chainId: arbitrumSepolia.id, bridgeId: null, color: 'emerald' },
  { id: 'arc', label: 'Arc', chainId: arcTestnet.id, bridgeId: 'Arc_Testnet', color: 'purple' },
  { id: 'base', label: 'Base', chainId: baseSepolia.id, bridgeId: 'Base_Sepolia', color: 'purple' },
] as const

type RouteId = typeof ROUTES[number]['id']
type Step = 'idle' | 'switching' | 'bridging' | 'attesting' | 'approving' | 'contributing' | 'recording' | 'done' | 'error'

const STEP_LABELS: Record<Step, string> = {
  idle: '',
  switching: 'switching chain...',
  bridging: 'bridging USDC to Arbitrum...',
  attesting: 'waiting for attestation...',
  approving: 'approving USDC...',
  contributing: 'sending tip...',
  recording: 'recording...',
  done: '',
  error: '',
}

interface TipFormProps {
  creatorAddress: string
  creatorName?: string
  onSuccess?: () => void
}

export function TipForm({ creatorAddress, creatorName, onSuccess }: TipFormProps) {
  const { address, isConnected, chainId } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { switchChainAsync } = useSwitchChain()
  const { writeContractAsync } = useWriteContract()
  const arbPublicClient = usePublicClient({ chainId: arbitrumSepolia.id })

  const [route, setRoute] = useState<RouteId>('arbitrum')
  const [amount, setAmount] = useState('')
  const [step, setStep] = useState<Step>('idle')
  const [error, setError] = useState('')
  const [payout, setPayout] = useState<any>(null)
  const [txHash, setTxHash] = useState('')
  const [tippedRoute, setTippedRoute] = useState<RouteId | null>(null)

  // auto-select route based on wallet chain — but not during an active tip
  const isActive = step !== 'idle' && step !== 'done' && step !== 'error'
  useEffect(() => {
    if (!chainId || isActive) return
    const match = ROUTES.find(r => r.chainId === chainId)
    if (match) setRoute(match.id)
  }, [chainId, isActive])

  const activeRoute = ROUTES.find(r => r.id === route)!
  const isDirect = !activeRoute.bridgeId

  const handleTip = async () => {
    if (!address || !walletClient || !amount || parseFloat(amount) <= 0 || !arbPublicClient) return

    setError('')
    setPayout(null)
    setTxHash('')
    setTippedRoute(route)

    try {
      // bridge flow: switch to source, bridge, then switch to arb
      if (!isDirect) {
        if (chainId !== activeRoute.chainId) {
          setStep('switching')
          await switchChainAsync({ chainId: activeRoute.chainId })
        }

        setStep('bridging')
        const { BridgeKit } = await import('@circle-fin/bridge-kit')
        const { createAdapterFromProvider } = await import('@circle-fin/adapter-viem-v2')

        const provider = (walletClient.transport as any)?.value?.provider
          ?? (typeof window !== 'undefined' ? (window as any).ethereum : null)
        if (!provider) throw new Error('no wallet provider found')

        const adapter = await createAdapterFromProvider({ provider })
        const kit = new BridgeKit()

        setStep('attesting')
        const result = await kit.bridge({
          from: { adapter, chain: activeRoute.bridgeId as any },
          to: { adapter, chain: 'Arbitrum_Sepolia' as any },
          amount: amount,
        })

        if (result.state !== 'success') {
          const detail = (result as any)?.error?.message || (result as any)?.message || JSON.stringify(result)
          throw new Error(`bridge ${result.state}: ${detail}`)
        }
      }

      // switch to arb if not already there
      if (chainId !== arbitrumSepolia.id) {
        setStep('switching')
        await switchChainAsync({ chainId: arbitrumSepolia.id })
      }

      const amountUnits = parseUnits(amount, 6)

      // check USDC balance
      const balance = await arbPublicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address],
      })
      if (balance < amountUnits) {
        const balUsd = Number(balance) / 1e6
        throw new Error(`insufficient USDC balance (${balUsd.toFixed(2)} USDC). get testnet USDC from faucet.circle.com`)
      }

      // check allowance, approve if needed
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

      // contribute
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

      // wait for tx to be mined and check status
      const receipt = await arbPublicClient.waitForTransactionReceipt({ hash: contributeTx })
      if (receipt.status === 'reverted') {
        throw new Error('transaction reverted on-chain — check USDC balance')
      }

      // record in backend
      setStep('recording')
      const res = await fetch(`${API_URL}/api/contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patron: address,
          creator: creatorAddress,
          amount,
          chain: isDirect ? 'arbitrum' : 'bridge',
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
      console.error('tip failed:', err)
      const msg = err?.shortMessage || err?.message || 'unknown error'
      setError(msg.length > 300 ? msg.slice(0, 300) + '...' : msg)
      setStep('error')
    }
  }

  if (!isConnected) {
    return (
      <div className="text-center py-8">
        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-aurora-emerald/10 to-aurora-purple/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a2.25 2.25 0 00-2.25-2.25H15a3 3 0 11-6 0H5.25A2.25 2.25 0 003 12m18 0v6a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 9m18 0V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v3" />
          </svg>
        </div>
        <p className="text-zinc-500 text-sm">connect wallet to send a tip</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* route selector — segmented control */}
      <div className="flex gap-1 p-1 bg-white/[0.03] rounded-xl border border-white/[0.06]">
        {ROUTES.map((r) => {
          const isSelected = route === r.id
          const isDirect = !r.bridgeId
          return (
            <button
              key={r.id}
              onClick={() => setRoute(r.id)}
              disabled={isActive}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-all ${
                isSelected
                  ? isDirect
                    ? 'bg-aurora-emerald/15 text-aurora-emerald border border-aurora-emerald/25'
                    : 'bg-aurora-purple/15 text-aurora-purple border border-aurora-purple/25'
                  : 'text-zinc-500 hover:text-zinc-300 border border-transparent'
              }`}
            >
              <span>{r.label}</span>
              {isSelected && (
                <span className="block text-[10px] opacity-60 mt-0.5">
                  {isDirect ? 'direct' : 'bridge'}
                </span>
              )}
            </button>
          )
        })}
      </div>

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

      {/* amount input + submit */}
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
          onClick={handleTip}
          disabled={!amount || parseFloat(amount) <= 0 || isActive}
          className={`${isDirect ? 'btn-emerald' : 'btn-purple'} whitespace-nowrap transition-all`}
        >
          {isActive ? (
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              {step === 'switching' ? 'switching' :
               step === 'bridging' ? 'bridging' :
               step === 'attesting' ? 'attesting' :
               step === 'approving' ? 'approving' :
               step === 'contributing' ? 'tipping' :
               'recording'}
            </span>
          ) : (
            <>send tip</>
          )}
        </button>
      </div>

      {/* bridge info hint */}
      {!isDirect && step === 'idle' && (
        <p className="text-zinc-600 text-[11px] leading-relaxed">
          USDC will bridge from {activeRoute.label} to Arbitrum via CCTP, then tip. attestation takes ~10-15 min.
        </p>
      )}

      {/* progress bar for multi-step */}
      {isActive && (
        <div className="flex items-center gap-2.5 text-sm rounded-xl px-4 py-3 bg-white/[0.03] border border-white/[0.06]">
          <span className={`w-3.5 h-3.5 border-2 rounded-full animate-spin flex-shrink-0 ${
            isDirect
              ? 'border-aurora-emerald/30 border-t-aurora-emerald'
              : 'border-aurora-purple/30 border-t-aurora-purple'
          }`} />
          <span className={isDirect ? 'text-aurora-emerald' : 'text-aurora-purple'}>
            {STEP_LABELS[step]}
          </span>
        </div>
      )}

      {/* success */}
      {step === 'done' && (
        <div className="flex items-center gap-2 text-sm text-aurora-emerald bg-aurora-emerald/10 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>
            tipped {creatorName || 'creator'}
            {tippedRoute && tippedRoute !== 'arbitrum' && ` via ${ROUTES.find(r => r.id === tippedRoute)?.label}`}
          </span>
          {txHash && (
            <a
              href={`https://sepolia.arbiscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="underline ml-auto text-aurora-emerald/70 hover:text-aurora-emerald"
            >
              tx &rarr;
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
