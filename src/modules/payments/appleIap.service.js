const fs = require('fs');
const path = require('path');
const { SignedDataVerifier, Environment } = require('@apple/app-store-server-library');
const config = require('../../config');

// Apple root certificates (downloaded from apple.com/certificateauthority).
// The JWS x5c chain must terminate at one of these.
const CERTS_DIR = path.join(__dirname, '../../config/certs');

let rootCertificates = null;
const loadRootCertificates = () => {
  if (!rootCertificates) {
    rootCertificates = fs
      .readdirSync(CERTS_DIR)
      .filter((f) => f.endsWith('.cer'))
      .map((f) => fs.readFileSync(path.join(CERTS_DIR, f)));
  }
  return rootCertificates;
};

const verifiers = {};
const getVerifier = (environment) => {
  if (!verifiers[environment]) {
    verifiers[environment] = new SignedDataVerifier(
      loadRootCertificates(),
      true, // online OCSP revocation checks
      environment,
      config.apple.bundleId,
      config.apple.appAppleId
    );
  }
  return verifiers[environment];
};

/**
 * Verifies a StoreKit 2 signed transaction (JWS) — certificate chain against
 * Apple's roots, signature, bundleId and environment claims.
 *
 * Tries Production first, then Sandbox: App Review (and TestFlight) purchases
 * are signed for the sandbox environment.
 *
 * @param {string} signedTransaction The JWS string from the app
 * @returns {Promise<{transaction: object, environment: string}>} decoded payload
 * @throws VerificationException if the transaction fails verification in both environments
 */
const verifySignedTransaction = async (signedTransaction) => {
  let lastError;
  for (const environment of [Environment.PRODUCTION, Environment.SANDBOX]) {
    try {
      const transaction = await getVerifier(environment).verifyAndDecodeTransaction(signedTransaction);
      return { transaction, environment };
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError;
};

module.exports = { verifySignedTransaction };
