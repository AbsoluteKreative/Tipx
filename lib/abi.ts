export const VAULT_ABI = [
  {
    inputs: [
      { name: '_usdc', type: 'address' },
      { name: '_operator', type: 'address' },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [
      { name: 'creator', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'contribute',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'patron', type: 'address' },
      { name: 'creator', type: 'address' },
      { name: 'cashbackAmount', type: 'uint256' },
      { name: 'bonusAmount', type: 'uint256' },
    ],
    name: 'distributeLoyalty',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ name: 'amount', type: 'uint256' }],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'vaultBalance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'operator',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'usdc',
    outputs: [{ name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'patron', type: 'address' },
      { indexed: true, name: 'creator', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'creatorShare', type: 'uint256' },
      { name: 'protocolFee', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' },
    ],
    name: 'ContributionReceived',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'patron', type: 'address' },
      { indexed: true, name: 'creator', type: 'address' },
      { name: 'cashbackAmount', type: 'uint256' },
      { name: 'bonusAmount', type: 'uint256' },
      { name: 'timestamp', type: 'uint256' },
    ],
    name: 'LoyaltyDistributed',
    type: 'event',
  },
] as const

export const ERC20_ABI = [
  {
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'account', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const
