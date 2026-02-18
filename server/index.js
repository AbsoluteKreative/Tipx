require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ethers } = require('ethers');
const db = require('./db');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 7301;
const LOYALTY_PAYOUT_RATE = parseFloat(process.env.LOYALTY_PAYOUT_RATE || '0.005');

// vault ABI — only the functions we call from backend
const VAULT_ABI = [
  'function distributeLoyalty(address patron, address creator, uint256 cashbackAmount, uint256 bonusAmount)',
  'event LoyaltyDistributed(address indexed patron, address indexed creator, uint256 cashbackAmount, uint256 bonusAmount, uint256 timestamp)',
];

// operator wallet + vault setup
let vault = null;
let operatorWallet = null;

if (
  process.env.PLATFORM_WALLET_PRIVATE_KEY &&
  process.env.ARB_RPC_URL &&
  process.env.NEXT_PUBLIC_VAULT_ADDRESS
) {
  const provider = new ethers.JsonRpcProvider(process.env.ARB_RPC_URL);
  operatorWallet = new ethers.Wallet(process.env.PLATFORM_WALLET_PRIVATE_KEY, provider);
  vault = new ethers.Contract(
    process.env.NEXT_PUBLIC_VAULT_ADDRESS,
    VAULT_ABI,
    operatorWallet
  );
  console.log('operator wallet:', operatorWallet.address);
  console.log('vault:', process.env.NEXT_PUBLIC_VAULT_ADDRESS);
} else {
  console.warn('missing env vars — loyalty payouts disabled');
}

// prepared statements
const insertContribution = db.prepare(`
  INSERT INTO contributions (patron_address, creator_address, amount, chain, tx_hash, timestamp, creator_name)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`);

const countContributions = db.prepare(`
  SELECT COUNT(*) as count FROM contributions
  WHERE LOWER(patron_address) = LOWER(?) AND LOWER(creator_address) = LOWER(?)
`);

const getRecentContributions = db.prepare(`
  SELECT amount FROM contributions
  WHERE LOWER(patron_address) = LOWER(?) AND LOWER(creator_address) = LOWER(?)
  ORDER BY id DESC LIMIT ?
`);

const insertPayout = db.prepare(`
  INSERT INTO loyalty_payouts (patron_address, creator_address, patron_cashback, creator_bonus, qualifying_total, tx_hash, chain, timestamp)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

const getTotalCashback = db.prepare(`
  SELECT COALESCE(SUM(patron_cashback), 0) as total
  FROM loyalty_payouts WHERE LOWER(patron_address) = LOWER(?)
`);

// POST /api/contributions — record contribution + check loyalty
app.post('/api/contributions', async (req, res) => {
  try {
    const { patron, creator, amount, chain, txHash, creatorName } = req.body;

    if (!patron || !creator || !amount || !txHash) {
      return res.status(400).json({ error: 'missing fields' });
    }

    const now = Math.floor(Date.now() / 1000);
    insertContribution.run(patron, creator, parseFloat(amount), chain || 'arbitrum', txHash, now, creatorName || null);

    const { count } = countContributions.get(patron, creator);

    // every 3rd contribution triggers loyalty payout
    if (count % 3 === 0 && count > 0) {
      const lastThree = getRecentContributions.all(patron, creator, 3);
      const qualifyingTotal = lastThree.reduce((sum, t) => sum + t.amount, 0);

      const patronCashback = qualifyingTotal * LOYALTY_PAYOUT_RATE;
      const creatorBonus = qualifyingTotal * LOYALTY_PAYOUT_RATE;

      let payoutTxHash = null;

      // on-chain loyalty payout — arbitrum + bridge (bridge lands on Arb)
      if (vault && (chain === 'arbitrum' || chain === 'bridge' || !chain)) {
        try {
          const cashback = ethers.parseUnits(patronCashback.toFixed(6), 6);
          const bonus = ethers.parseUnits(creatorBonus.toFixed(6), 6);

          const tx = await vault.distributeLoyalty(patron, creator, cashback, bonus, { gasLimit: 300000 });
          const receipt = await tx.wait();
          payoutTxHash = receipt.hash;
          console.log('loyalty payout sent:', payoutTxHash);
        } catch (err) {
          console.error('loyalty payout tx failed:', err.message);
          // contribution still recorded even if payout fails
        }
      }

      insertPayout.run(
        patron, creator,
        patronCashback, creatorBonus, qualifyingTotal,
        payoutTxHash, chain || 'arbitrum', now
      );

      const { total } = getTotalCashback.get(patron);

      return res.json({
        success: true,
        contributionCount: count,
        payout: {
          triggered: true,
          cashbackAmount: patronCashback,
          bonusAmount: creatorBonus,
          qualifyingTotal: qualifyingTotal,
          txHash: payoutTxHash,
          totalCashback: total,
        },
      });
    }

    return res.json({
      success: true,
      contributionCount: count,
      payout: { triggered: false, untilNextPayout: 3 - (count % 3) },
    });
  } catch (err) {
    console.error('contribution error:', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// GET /api/patrons/:wallet — patron dashboard data
app.get('/api/patrons/:wallet', (req, res) => {
  try {
    const wallet = req.params.wallet;

    const creators = db.prepare(`
      SELECT creator_address, SUM(amount) as total_amount, COUNT(*) as contribution_count,
             MAX(timestamp) as last_contribution,
             (SELECT creator_name FROM contributions c2
              WHERE LOWER(c2.creator_address) = LOWER(contributions.creator_address)
              AND c2.creator_name IS NOT NULL
              ORDER BY c2.id DESC LIMIT 1) as creator_name
      FROM contributions WHERE LOWER(patron_address) = LOWER(?)
      GROUP BY creator_address ORDER BY last_contribution DESC
    `).all(wallet);

    const recentPayouts = db.prepare(`
      SELECT * FROM loyalty_payouts WHERE LOWER(patron_address) = LOWER(?)
      ORDER BY timestamp DESC LIMIT 20
    `).all(wallet);

    const { total } = getTotalCashback.get(wallet);

    const totalContributed = db.prepare(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM contributions WHERE LOWER(patron_address) = LOWER(?)
    `).get(wallet);

    const recentContributions = db.prepare(`
      SELECT creator_address, creator_name, amount, chain, tx_hash, timestamp
      FROM contributions WHERE LOWER(patron_address) = LOWER(?)
      ORDER BY timestamp DESC LIMIT 20
    `).all(wallet);

    res.json({
      creators,
      recentPayouts,
      recentContributions,
      totalCashback: total,
      totalContributed: totalContributed.total,
    });
  } catch (err) {
    console.error('patron error:', err);
    res.status(500).json({ error: 'internal error' });
  }
});

// GET /api/creators/:wallet — creator stats
app.get('/api/creators/:wallet', (req, res) => {
  try {
    const wallet = req.params.wallet;

    const recentContributions = db.prepare(`
      SELECT patron_address, amount, chain, tx_hash, timestamp
      FROM contributions WHERE LOWER(creator_address) = LOWER(?)
      ORDER BY timestamp DESC LIMIT 20
    `).all(wallet);

    const stats = db.prepare(`
      SELECT COUNT(*) as total_contributions, COALESCE(SUM(amount), 0) as total_amount,
             COUNT(DISTINCT patron_address) as unique_patrons
      FROM contributions WHERE LOWER(creator_address) = LOWER(?)
    `).get(wallet);

    res.json({ recentContributions, stats });
  } catch (err) {
    console.error('creator error:', err);
    res.status(500).json({ error: 'internal error' });
  }
});

const HOST = process.env.HOST || '127.0.0.1';
app.listen(PORT, HOST, () => {
  console.log(`tipx api running on ${HOST}:${PORT}`);
});
