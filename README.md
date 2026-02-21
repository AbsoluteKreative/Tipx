# TipX

universal tipping platform. 2 payment rails, 3 chains, 1 unified backend.

support any creator, from any chain, in USDC. creators are identified by ENS names.
patrons connect their wallet and the platform handles routing, fee splitting,
and automatic loyalty payouts.

built for [Arbitrum NYC](https://arbitrum-nyc.hackquest.io).

> **[demo video](#)** (link TBD)

---

## why

patreon and buymeacoffee take 5-12% fees, lock creators into a single platform,
and don't work with crypto at all. crypto-native alternatives are chain-specific —
if your fans are on Base and you're on Arbitrum, tough luck.

TipX fixes this: one platform, every chain, USDC-denominated so creators get
predictable income (no volatility exposure), with transparent on-chain fee splits
and built-in loyalty payouts to drive repeat support.

## how it works

```
                          ┌──────────────────────────────────┐
                          │           frontend                │
                          │     next.js + tailwind + wagmi    │
                          │                                    │
                          │  ┌──────────────────────────────┐ │
                          │  │     EVM wallet (rainbowkit)   │ │
                          │  └──────────────┬───────────────┘ │
                          └─────────────────┼─────────────────┘
                                            │
                        ┌───────────────────┼────────┐
                        │                   │        │
                        ▼                   ▼        │
          ┌──────────────────┐  ┌────────────────┐   │
          │ Arbitrum direct  │  │   BridgeKit    │   │
          │                  │  │   (CCTP v2)    │   │
          │ approve USDC     │  │                │   │
          │ -> contribute()  │  │ burn on source │   │
          │ on Vault         │  │ -> attest      │   │
          │ 95/5 split       │  │ -> mint on Arb │   │
          │ on-chain         │  │ -> contribute()│   │
          └────────┬─────────┘  └───────┬────────┘   │
                   │                    │             │
                   └────────────────────┴─────────────┘
                                        │
                                        ▼
                            ┌─────────────────────────┐
                            │ POST /api/contributions  │
                            │   express backend        │
                            │   (chain-agnostic)       │
                            │                          │
                            │ - record in sqlite       │
                            │ - count per pair         │
                            │ - every 3rd contribution:│
                            │   0.5% cashback +        │
                            │   0.5% creator bonus     │
                            │   via distributeLoyalty() │
                            └─────────────────────────┘
```

the backend doesn't know or care which chain was used. every payment path
produces the same result: a contribution event with `(patron, creator, amount, chain, txHash)`.
adding a new chain = one new frontend component. zero changes to payout logic,
DB schema, or API.

## payment rails

### 1. Arbitrum direct (primary)

patron has USDC on Arbitrum Sepolia -> approve ContributionVault -> `contribute(creator, amount)`.
vault splits 95% to creator, 5% to protocol fee pool. emits `ContributionReceived` event.
loyalty payouts are also on-chain — `distributeLoyalty()` settles to both patron and creator atomically, making the vault a multi-recipient settlement layer.

### 2. cross-chain via BridgeKit (CCTP v2)

patron has USDC on any CCTP-supported chain (Arc, Base, Ethereum, Polygon, Avalanche,
Solana, and others — 500+ routes across 17 chains) -> BridgeKit handles
the burn-attest-mint cycle -> USDC arrives on Arbitrum -> approve + contribute.
real USDC, not wrapped — CCTP v2 burns and mints natively.

## ENS integration

creators are people, not hex addresses. ENS is core infrastructure, not an
afterthought — removing it would break creator discovery, profile rendering,
and the onboarding flow. we use viem's ENS functions directly (custom code,
not wagmi/rainbowkit defaults):

- **forward resolution** via `getEnsAddress()` — type any .eth name in the search bar to find and support a creator
- **text records** via `getEnsText()` — avatar, description, twitter, url pulled from on-chain records to build creator profiles
- **reverse resolution** via `getEnsName()` — show human-readable names for unknown addresses in the patron dashboard
- **dual resolution** — `*.tipx.eth` subdomains resolve via Sepolia ENS, everything else via mainnet

### free ENS subdomains for creators

creators get a free `*.tipx.eth` subdomain when they join — no registration fee,
no gas costs, no need to understand ENS or own ETH. the platform registers it for
them with their wallet address and profile data as text records.

this doubles as a distribution strategy:
- **for creators**: a human-readable identity they can share anywhere. "support me at alice.tipx.eth" on twitter/youtube/instagram — zero friction, no crypto knowledge needed. in production, each creator also gets a web2 vanity URL (`alice.tipx.app`) so non-crypto audiences can contribute without knowing what ENS is
- **for the platform**: every creator sharing their name on social media is organic marketing. the `.tipx.eth` suffix (or `tipx.app` URL) drives discovery back to the platform
- **for the ecosystem**: more ENS names in the wild, more text records populated, more real usage of ENS as identity infrastructure

registered `tipx.eth` on Sepolia with subdomains (alice.tipx.eth, bob.tipx.eth,
carol.tipx.eth), each with address records and text records (avatar, description,
twitter, url). the creator's identity, bio, and social links all live on-chain,
owned by the creator, portable across any platform that reads ENS.

## business model

| | |
|---|---|
| protocol fee | 5% of every contribution (on-chain, transparent) |
| creator share | 95% of every contribution (direct to their wallet) |
| loyalty payouts | 0.5% cashback to patron + 0.5% bonus to creator every 3rd contribution |
| platform net | 4% after loyalty payouts |
| denomination | USDC — stable revenue, no volatility for creators or platform |

the 3-contribution loyalty cycle drives repeat support. patrons see progress dots toward
their next payout. creators get a bonus on top of their 95% share. the platform
funds payouts from its 5% cut, netting 4% — still competitive vs patreon's 5-12%.

---

## smart contract

[`ContributionVault.sol`](contracts/ContributionVault.sol) — deployed and
verified on Arbitrum Sepolia.

```solidity
contribute(address creator, uint256 amount)              // ERC20 transferFrom, 95/5 split
distributeLoyalty(address patron, address creator,        // operator-only, atomic loyalty payout
                  uint256 cashback, uint256 bonus)
withdraw(uint256 amount)                                 // withdraw accumulated fees
vaultBalance() -> uint256                                // check protocol fee pool
```

deployed at: [`0xC74D73971abE0B7EBc0Ef904aE8A5B925e87491B`](https://sepolia.arbiscan.io/address/0xC74D73971abE0B7EBc0Ef904aE8A5B925e87491B)

## tech stack

| layer | tech |
|-------|------|
| frontend | next.js 15 (app router), react 19, tailwind |
| wallets | wagmi, viem, rainbowkit |
| cross-chain | @circle-fin/bridge-kit (CCTP v2) |
| smart contract | solidity 0.8.20, foundry |
| backend | express 5, better-sqlite3 |
| ENS | viem ENS functions (custom resolution, text records) |

## design decisions

- **USDC-only** — people think in dollars. stable for creators, stable for platform revenue. no volatility exposure.
- **chain-agnostic backend** — the DB schema doesn't know about chains. a contribution is a contribution. makes adding new chains trivial.
- **ENS as identity layer** — creators are people, not hex addresses. text records double as a decentralised profile system.
- **BridgeKit for cross-chain** — CCTP v2 burns-and-mints real USDC (not wrapped). native bridging, no liquidity pools.
- **Arbitrum as settlement chain** — fast finality, low fees, well-supported by wallets and tooling. all contributions settle here.

## project structure

```
contracts/
  ContributionVault.sol       # ERC20 USDC vault w/ 95/5 split
  script/Deploy.s.sol         # foundry deployment script

app/
  page.tsx                    # homepage — ENS search + creator grid
  creator/[id]/page.tsx       # creator profile + 2 contribution methods
  profile/page.tsx            # patron dashboard
  layout.tsx                  # root layout w/ wallet providers

components/
  WalletProvider.tsx           # wagmi + rainbowkit
  TipForm.tsx                  # unified contribution flow (direct + cross-chain)
  ENSProfile.tsx               # creator profile from ENS text records
  ContributionFeed.tsx         # on-chain ContributionReceived events
  Header.tsx                   # nav + connect button

lib/
  config.ts                    # chain defs, vault address, env vars
  creators.ts                  # creator data (ENS names + wallets)
  ens.ts                       # dual ENS resolution (Sepolia + mainnet)
  abi.ts                       # vault + ERC20 ABIs

server/
  index.js                     # express API + loyalty payout logic
  db.js                        # better-sqlite3 setup (WAL mode)
```

## running locally

```bash
# install deps
npm install

# copy env template, fill in values
cp .env.example .env

# start frontend (port 7300) + backend (port 7301)
./start.sh
```

### environment variables

```
PLATFORM_WALLET_PRIVATE_KEY         # EVM private key for loyalty payouts
ARB_RPC_URL                         # Arbitrum Sepolia RPC (backend)
NEXT_PUBLIC_ARB_RPC_URL             # Arbitrum Sepolia RPC (frontend)
NEXT_PUBLIC_VAULT_ADDRESS           # deployed ContributionVault
NEXT_PUBLIC_USDC_ADDRESS            # USDC on Arbitrum Sepolia
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID  # from cloud.walletconnect.com
NEXT_PUBLIC_API_URL                 # backend URL (default http://localhost:7301)
LOYALTY_PAYOUT_RATE                 # default 0.005 (0.5%)
```

testnet tokens:
- **USDC** (all chains): [faucet.circle.com](https://faucet.circle.com)
- **Arbitrum Sepolia ETH**: bridge from Sepolia L1 or use a faucet
- **Base Sepolia ETH** (for cross-chain): any Base Sepolia faucet

### deploying the vault

```bash
# needs foundry installed (curl -L https://foundry.paradigm.xyz | bash)
forge install
forge script contracts/script/Deploy.s.sol --rpc-url $ARB_RPC_URL --broadcast --private-key $PLATFORM_WALLET_PRIVATE_KEY
```

## scaling path

what we'd change for production:

- **PostgreSQL** + connection pooling — contribution volume, analytics, full-text search
- **BullMQ + Redis** — async loyalty payouts w/ retry, dead letter queue for failed txs
- **event-driven architecture** — on-chain event listeners -> job queue -> settlement, instead of synchronous in API handler
- **per-contribution approvals** — replace the blanket USDC approval with exact-amount or user-chosen limits
- **event indexing** — replace the block-window getLogs approach with a proper indexer (subgraph or custom)
- **multi-chain payouts** — consider paying out loyalty on the same chain the contribution originated from (currently all payouts settle on Arbitrum)
- **vanity subdomains** — wildcard DNS (`*.tipx.app`) + Next.js middleware to route `alice.tipx.app` to creator pages
- **horizontal scaling** — stateless API servers, shared job queue, read replicas

## chains

| chain | ID | role |
|-------|-----|------|
| Arbitrum Sepolia | 421614 | primary — vault, payouts, settlement |
| Arc Testnet | 5042002 | BridgeKit source (Circle's L1, cross-chain USDC) |
| Base Sepolia | 84532 | BridgeKit source (cross-chain USDC) |

any CCTP-supported chain can be added as a bridge source — Base is included as an example of a non-Arbitrum, non-Circle chain.

## links

- [Arbitrum Sepolia explorer](https://sepolia.arbiscan.io)
- [deployed vault (verified)](https://sepolia.arbiscan.io/address/0xC74D73971abE0B7EBc0Ef904aE8A5B925e87491B)
- [Circle faucet](https://faucet.circle.com)
- [ENS Sepolia app](https://sepolia.app.ens.domains)

