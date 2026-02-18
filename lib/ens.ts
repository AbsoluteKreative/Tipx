import { createPublicClient, http } from 'viem'
import { mainnet, sepolia } from 'viem/chains'
import { normalize } from 'viem/ens'

// mainnet client — for resolving real-world ENS names (vitalik.eth, etc.)
const mainnetClient = createPublicClient({
  chain: mainnet,
  transport: http('https://eth.drpc.org'),
})

// sepolia client — for resolving our tipx.eth subdomains
const sepoliaClient = createPublicClient({
  chain: sepolia,
  transport: http('https://ethereum-sepolia-rpc.publicnode.com'),
})

// pick the right client: *.tipx.eth → sepolia, everything else → mainnet
function clientFor(name: string) {
  return name.endsWith('.tipx.eth') ? sepoliaClient : mainnetClient
}

// reverse resolution: address → ENS name (like a PTR record)
export async function reverseENS(address: string): Promise<string | null> {
  try {
    const name = await mainnetClient.getEnsName({
      address: address as `0x${string}`,
    })
    return name
  } catch {
    return null
  }
}

export async function resolveENSName(name: string): Promise<string | null> {
  try {
    const address = await clientFor(name).getEnsAddress({
      name: normalize(name),
    })
    return address
  } catch {
    return null
  }
}

export async function getENSAvatar(name: string): Promise<string | null> {
  try {
    const avatar = await clientFor(name).getEnsAvatar({
      name: normalize(name),
    })
    return avatar
  } catch {
    return null
  }
}

export async function getENSTextRecord(name: string, key: string): Promise<string | null> {
  try {
    const text = await clientFor(name).getEnsText({
      name: normalize(name),
      key,
    })
    return text ?? null
  } catch {
    return null
  }
}

export interface ENSProfile {
  name: string
  address: string | null
  avatar: string | null
  description: string | null
  twitter: string | null
  url: string | null
}

export async function getENSProfile(name: string): Promise<ENSProfile> {
  const [address, avatar, description, twitter, url] = await Promise.all([
    resolveENSName(name),
    getENSAvatar(name),
    getENSTextRecord(name, 'description'),
    getENSTextRecord(name, 'com.twitter'),
    getENSTextRecord(name, 'url'),
  ])

  return { name, address, avatar, description, twitter, url }
}
