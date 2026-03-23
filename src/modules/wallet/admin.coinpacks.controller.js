const CoinPack = require('./CoinPack.model');
const AppError = require('../../common/AppError');
const logger = require('../../common/logger');

exports.getCoinPacks = async (req, res, next) => {
  try {
    const packs = await CoinPack.find().sort({ sortOrder: 1, priceINR: 1 });
    res.status(200).json({ success: true, data: packs });
  } catch (error) {
    next(error);
  }
};

exports.createCoinPack = async (req, res, next) => {
  try {
    const pack = new CoinPack(req.body);
    await pack.save();
    logger.info(`Admin ${req.user.userId} created coin pack ${pack._id}`);
    res.status(201).json({ success: true, data: pack });
  } catch (error) {
    next(error);
  }
};

exports.updateCoinPack = async (req, res, next) => {
  try {
    const pack = await CoinPack.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!pack) throw AppError.notFound('Coin pack not found');
    logger.info(`Admin ${req.user.userId} updated coin pack ${req.params.id}`);
    res.status(200).json({ success: true, data: pack });
  } catch (error) {
    next(error);
  }
};

exports.deleteCoinPack = async (req, res, next) => {
  try {
    const pack = await CoinPack.findByIdAndDelete(req.params.id);
    if (!pack) throw AppError.notFound('Coin pack not found');
    logger.info(`Admin ${req.user.userId} deleted coin pack ${req.params.id}`);
    res.status(200).json({ success: true, message: 'Coin pack deleted' });
  } catch (error) {
    next(error);
  }
};
