require('dotenv').config();
const { ethers } = require('ethers');

// Sepolia ENS contracts (from docs.ens.domains/learn/deployments)
const REGISTRY = '0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e';
const CONTROLLER = '0xfb3cE5D01e0f33f41DbB39035dB9745962F1f968';
const RESOLVER = '0xE99638b40E4Fff0129D56f03b55b6bbC4BBE49b5';
const NAME_WRAPPER = '0x0635513f179D50A207757E05759CbD106d7dFcE8';

// Sepolia controller uses a Registration struct (from IETHRegistrarController.sol)
// struct Registration { string label; address owner; uint256 duration; bytes32 secret;
//   address resolver; bytes[] data; uint8 reverseRecord; bytes32 referrer; }
const controllerABI = [
  'function available(string memory name) view returns (bool)',
  'function rentPrice(string memory name, uint256 duration) view returns (tuple(uint256 base, uint256 premium))',
  'function makeCommitment(tuple(string label, address owner, uint256 duration, bytes32 secret, address resolver, bytes[] data, uint8 reverseRecord, bytes32 referrer) registration) pure returns (bytes32)',
  'function commit(bytes32 commitment)',
  'function register(tuple(string label, address owner, uint256 duration, bytes32 secret, address resolver, bytes[] data, uint8 reverseRecord, bytes32 referrer) registration) payable',
];

const nameWrapperABI = [
  'function setSubnodeRecord(bytes32 parentNode, string calldata label, address owner, address resolver, uint64 ttl, uint32 fuses, uint64 expiry)',
  'function getData(uint256 id) view returns (address owner, uint32 fuses, uint64 expiry)',
  'function ownerOf(uint256 id) view returns (address)',
];

const registryABI = [
  'function owner(bytes32 node) view returns (address)',
  'function setSubnodeRecord(bytes32 node, bytes32 label, address owner, address resolver, uint64 ttl)',
];

const resolverABI = [
  'function setText(bytes32 node, string calldata key, string calldata value)',
  'function text(bytes32 node, string calldata key) view returns (string)',
  'function setAddr(bytes32 node, address addr)',
  'function addr(bytes32 node) view returns (address)',
];

const NAME = 'tipx';
const DOMAIN = `${NAME}.eth`;
const DURATION = 365 * 24 * 60 * 60; // 1 year

// creator profiles for text records
const CREATORS = [
  {
    label: 'alice',
    evmAddress: '0xb2Dc780D85c3bA45a54DD4C56038Dab8d25Feb54',
    records: {
      description: 'digital artist & pixel enthusiast. creating generative art and pixel worlds.',
      'com.twitter': 'alice_pixels',
      url: 'https://alice.art',
      avatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=alicetipx&size=200&backgroundColor=b6e3f4',
    },
  },
  {
    label: 'bob',
    evmAddress: '0x72F2B9665A6A0175E666bA6B80c14d98718442A1',
    records: {
      description: 'open source developer. building tools for the decentralised web.',
      'com.twitter': 'bob_builds',
      url: 'https://bob.dev',
      avatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=bobtipx&size=200&backgroundColor=c0aede',
    },
  },
  {
    label: 'carol',
    evmAddress: '0xB7451C3890ED0bbEc9a2c63028adF558bAC8a442',
    records: {
      description: 'music producer & sound designer. ambient + electronic.',
      'com.twitter': 'carol_sounds',
      url: 'https://carol.music',
      avatar: 'https://api.dicebear.com/7.x/pixel-art/svg?seed=carolsounds&size=200&backgroundColor=ffd5dc',
    },
  },
  {
    label: 'parry',
    evmAddress: '0x2643da3eb88CD85A92F62072c1D7F53Ad995932e',
    records: {
      description: 'GTM · marketing · product · mentor · ex-StackAI · Oxford',
      'com.twitter': 'ParrySondhi',
      url: 'https://github.com/AbsoluteKreative',
      avatar: 'https://unavatar.io/x/ParrySondhi',
    },
  },
];

async function main() {
  const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
  const wallet = new ethers.Wallet(process.env.PLATFORM_WALLET_PRIVATE_KEY, provider);

  console.log('wallet:', wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log('balance:', ethers.formatEther(balance), 'Sepolia ETH');

  const controller = new ethers.Contract(CONTROLLER, controllerABI, wallet);
  const nameWrapper = new ethers.Contract(NAME_WRAPPER, nameWrapperABI, wallet);
  const registry = new ethers.Contract(REGISTRY, registryABI, wallet);
  const resolver = new ethers.Contract(RESOLVER, resolverABI, wallet);

  // --- step 1: check if we need to register ---
  const parentNode = ethers.namehash(DOMAIN);
  let needsRegistration = true;

  const isAvailable = await controller.available(NAME);
  console.log(`\n${DOMAIN} available:`, isAvailable);

  if (!isAvailable) {
    try {
      const nwOwner = await nameWrapper.ownerOf(parentNode);
      if (nwOwner.toLowerCase() === wallet.address.toLowerCase()) {
        console.log('we already own it (via NameWrapper). skipping registration.');
        needsRegistration = false;
      } else {
        const regOwner = await registry.owner(parentNode);
        if (regOwner.toLowerCase() === wallet.address.toLowerCase()) {
          console.log('we own it via registry. skipping registration.');
          needsRegistration = false;
        } else {
          console.error('name taken by someone else!');
          console.error('  NameWrapper owner:', nwOwner);
          console.error('  Registry owner:', regOwner);
          process.exit(1);
        }
      }
    } catch (err) {
      console.error('ownership check failed:', err.message?.slice(0, 150));
      process.exit(1);
    }
  }

  if (needsRegistration) {
    // --- step 2: get price ---
    const price = await controller.rentPrice(NAME, DURATION);
    const totalPrice = price.base + price.premium;
    console.log('price:', ethers.formatEther(totalPrice), 'ETH');

    if (balance < totalPrice * 2n) {
      console.error('not enough ETH! need at least', ethers.formatEther(totalPrice * 2n));
      process.exit(1);
    }

    const secret = ethers.hexlify(ethers.randomBytes(32));
    const referrer = ethers.hexlify(ethers.randomBytes(32));

    const registration = {
      label: NAME,
      owner: wallet.address,
      duration: DURATION,
      secret: secret,
      resolver: RESOLVER,
      data: [],
      reverseRecord: 0,
      referrer: referrer,
    };

    // --- step 3: commit ---
    console.log('\nmaking commitment...');
    const commitment = await controller.makeCommitment(registration);
    console.log('commitment:', commitment);

    const commitTx = await controller.commit(commitment);
    console.log('commit tx:', commitTx.hash);
    await commitTx.wait();
    console.log('committed! waiting 60s for minCommitmentAge...');

    // sepolia block times are irregular, need more than 60s wall time
    for (let i = 90; i > 0; i -= 5) {
      process.stdout.write(`\r  ${i}s remaining...`);
      await new Promise((r) => setTimeout(r, 5000));
    }
    console.log('\r  done waiting!          ');

    // --- step 4: register ---
    const registerValue = totalPrice * 110n / 100n; // 10% buffer
    console.log('registering', DOMAIN, '...');
    const registerTx = await controller.register(registration, { value: registerValue });
    console.log('register tx:', registerTx.hash);
    await registerTx.wait();
    console.log(`registered ${DOMAIN}!`);
  }

  // --- step 5: create subdomains via Registry + set records ---
  // name is NOT wrapped in NameWrapper, we own it directly in the Registry
  console.log('\ncreating subdomains via Registry (name is unwrapped)...');

  for (const creator of CREATORS) {
    const subdomain = `${creator.label}.${DOMAIN}`;
    const subNode = ethers.namehash(subdomain);
    const labelHash = ethers.id(creator.label); // keccak256 of label
    console.log(`\n--- ${subdomain} ---`);

    // create subdomain via Registry.setSubnodeRecord
    try {
      console.log('creating subdomain...');
      const tx = await registry.setSubnodeRecord(
        parentNode,
        labelHash,
        wallet.address,
        RESOLVER,
        0
      );
      console.log('tx:', tx.hash);
      await tx.wait();
      console.log('subdomain created!');
    } catch (err) {
      console.log('subdomain creation failed (may already exist):', err.message?.slice(0, 150));
    }

    // set addr record (EVM address)
    try {
      console.log(`setting addr: ${creator.evmAddress}`);
      const tx = await resolver.setAddr(subNode, creator.evmAddress);
      await tx.wait();
    } catch (err) {
      console.log('setAddr failed:', err.message?.slice(0, 150));
    }

    // set text records
    for (const [key, value] of Object.entries(creator.records)) {
      try {
        console.log(`setting ${key}: ${value.slice(0, 50)}${value.length > 50 ? '...' : ''}`);
        const tx = await resolver.setText(subNode, key, value);
        await tx.wait();
      } catch (err) {
        console.log(`setText(${key}) failed:`, err.message?.slice(0, 150));
      }
    }
  }

  // --- step 7: verify ---
  console.log('\n=== verification ===');
  for (const creator of CREATORS) {
    const subdomain = `${creator.label}.${DOMAIN}`;
    const subNode = ethers.namehash(subdomain);

    const addr = await resolver.addr(subNode);
    const desc = await resolver.text(subNode, 'description');
    const twitter = await resolver.text(subNode, 'com.twitter');

    console.log(`\n${subdomain}:`);
    console.log(`  addr: ${addr}`);
    console.log(`  description: ${desc}`);
    console.log(`  twitter: ${twitter}`);
  }

  console.log('\nall done!');
}

main().catch((err) => {
  console.error('fatal:', err);
  process.exit(1);
});
