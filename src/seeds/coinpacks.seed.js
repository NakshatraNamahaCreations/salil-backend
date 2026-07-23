/**
 * Seeds the coin packs sold via Apple In-App Purchase (and Razorpay on
 * Android/web). Idempotent — matches on appleProductId, updates if present,
 * and DEACTIVATES any active pack that is not in the list below (so switching
 * denominations doesn't leave stale packs showing in the app).
 *
 *   node src/seeds/coinpacks.seed.js
 *
 * The `appleProductId` here MUST match the CONSUMABLE product IDs created in
 * App Store Connect. 1 coin = ₹1.
 *
 * NOTE: Apple's minimum IAP price in India is ~₹29, so a ₹20 pack may not be
 * sellable on iOS — if App Store Connect won't offer a ₹20 tier, either drop
 * `coins_20` or raise its price to the lowest available tier.
 */
const mongoose = require('mongoose');
const config = require('../config');
const CoinPack = require('../modules/wallet/CoinPack.model');

const PACKS = [
  { name: '30 Coins',  coins: 30,  bonusCoins: 0, priceINR: 30,  appleProductId: 'coinpack_30',  sortOrder: 1 },
  { name: '50 Coins',  coins: 50,  bonusCoins: 0, priceINR: 50,  appleProductId: 'coinpack_50',  sortOrder: 2 },
  { name: '100 Coins', coins: 100, bonusCoins: 0, priceINR: 100, appleProductId: 'coinpack_100', sortOrder: 3 },
  { name: '200 Coins', coins: 200, bonusCoins: 0, priceINR: 200, appleProductId: 'coinpack_200', sortOrder: 4, isOffer: true, offerLabel: 'Popular' },
  { name: '250 Coins', coins: 250, bonusCoins: 0, priceINR: 250, appleProductId: 'coinpack_250', sortOrder: 5 },
  { name: '500 Coins', coins: 500, bonusCoins: 0, priceINR: 500, appleProductId: 'coinpack_500', sortOrder: 6, isOffer: true, offerLabel: 'Best Value' },
];

(async () => {
  await mongoose.connect(config.mongodb.uri);

  const keep = PACKS.map((p) => p.appleProductId);

  // Upsert the current set.
  for (const p of PACKS) {
    await CoinPack.findOneAndUpdate(
      { appleProductId: p.appleProductId },
      { ...p, isActive: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`✅ ${p.name} → ${p.appleProductId} (₹${p.priceINR}, ${p.coins}+${p.bonusCoins} coins)`);
  }

  // Deactivate any other pack so the app only shows the current set.
  const deactivated = await CoinPack.updateMany(
    { appleProductId: { $nin: keep } },
    { $set: { isActive: false } }
  );
  if (deactivated.modifiedCount) {
    console.log(`🚫 Deactivated ${deactivated.modifiedCount} old pack(s) no longer offered.`);
  }

  await mongoose.connection.close();
  console.log('Coin packs seeded.');
})().catch((e) => { console.error(e); process.exit(1); });
