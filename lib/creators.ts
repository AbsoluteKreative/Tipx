export interface Creator {
  id: string
  ensName: string
  wallet?: string
  description?: string
  avatar?: string
}

// demo creators — wallet addresses generated for hackathon
// ENS names used for display + profile enrichment (resolved at runtime)
export const CREATORS: Creator[] = [
  {
    id: 'alice',
    ensName: 'alice.tipx.eth',
    wallet: '0xb2Dc780D85c3bA45a54DD4C56038Dab8d25Feb54',
    description: 'digital artist & pixel enthusiast',
  },
  {
    id: 'bob',
    ensName: 'bob.tipx.eth',
    wallet: '0x72F2B9665A6A0175E666bA6B80c14d98718442A1',
    description: 'open source developer',
  },
  {
    id: 'carol',
    ensName: 'carol.tipx.eth',
    wallet: '0xB7451C3890ED0bbEc9a2c63028adF558bAC8a442',
    description: 'music producer & sound designer',
  },
  {
    id: 'parry',
    ensName: 'parry.tipx.eth',
    wallet: '0x2643da3eb88CD85A92F62072c1D7F53Ad995932e',
    description: 'GTM · marketing · product · mentor · ex-StackAI · Oxford',
    avatar: '/parry.jpg',
  },
  // real ENS profiles — resolved via mainnet, showcases universal tipping
  {
    id: 'brantly',
    ensName: 'brantly.eth',
    wallet: '0x983110309620D911731Ac0932219af06091b6744',
    description: 'ENS DAO delegate & Security Council',
  },
  {
    id: 'nick',
    ensName: 'nick.eth',
    wallet: '0xb8c2C29ee19D8307cb7255e1Cd9CbDE883A267d5',
    description: 'lead developer of ENS',
  },
  {
    id: 'gregskril',
    ensName: 'gregskril.eth',
    wallet: '0x179A862703a4adfb29896552DF9e307980D19285',
    description: 'baking & building on web3',
  },
]
