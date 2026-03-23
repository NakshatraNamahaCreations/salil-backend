const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../common/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongodb.uri, {
      maxPoolSize: 10,
    });
    logger.info(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    logger.error('MongoDB connection error:', error.message);
    process.exit(1);
  }

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB error:', err.message);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected. Attempting reconnect...');
  });
};

module.exports = connectDB;
