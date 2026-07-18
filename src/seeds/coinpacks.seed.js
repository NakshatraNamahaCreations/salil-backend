/**
 * Seeds the default coin packs sold via Apple In-App Purchase (and Razorpay on
 * Android/web). Idempotent — matches on appleProductId, updates if present.
 *
 *   node src/seeds/coinpacks.seed.js
 *
 * The `appleProductId` here MUST match the CONSUMABLE product IDs created in
 * App Store Connect. 1 coin = ₹1.
 */
const mongoose = require('mongoose');
const config = require('../config');
const CoinPack = require('../modules/wallet/CoinPack.model');

const PACKS = [
  { name: '100 Coins',  coins: 100,  bonusCoins: 0,   priceINR: 99,  appleProductId: 'coins_100',  sortOrder: 1 },
  { name: '300 Coins',  coins: 300,  bonusCoins: 25,  priceINR: 299, appleProductId: 'coins_300',  sortOrder: 2 },
  { name: '500 Coins',  coins: 500,  bonusCoins: 60,  priceINR: 499, appleProductId: 'coins_500',  sortOrder: 3, isOffer: true, offerLabel: 'Most Popular' },
  { name: '1000 Coins', coins: 1000, bonusCoins: 175, priceINR: 999, appleProductId: 'coins_1000', sortOrder: 4, isOffer: true, offerLabel: 'Best Value' },
];

(async () => {
  await mongoose.connect(config.mongodb.uri);
  for (const p of PACKS) {
    await CoinPack.findOneAndUpdate(
      { appleProductId: p.appleProductId },
      { ...p, isActive: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`✅ ${p.name} → ${p.appleProductId} (₹${p.priceINR}, ${p.coins}+${p.bonusCoins} coins)`);
  }
  await mongoose.connection.close();
  console.log('Coin packs seeded.');
})().catch((e) => { console.error(e); process.exit(1); });
