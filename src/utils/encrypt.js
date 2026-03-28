const CryptoJS = require('crypto-js');
require('dotenv').config();

const SECRET = process.env.ENCRYPT_SECRET || 'mcdc_encrypt_secret_2024';

/**
 * Generate an encrypted card code from an employee ID.
 * Format encoded: "MCDC:<employeeId>:<timestamp>"
 */
function generateEncryptedCode(employeeId) {
  const payload = `MCDC:${employeeId}:${Date.now()}`;
  const encrypted = CryptoJS.AES.encrypt(payload, SECRET).toString();
  // Make URL-safe base64
  return Buffer.from(encrypted).toString('base64url');
}

/**
 * Decrypt a card code and return the embedded employee ID.
 * Returns null if invalid.
 */
function decryptCode(encryptedCode) {
  try {
    const base64 = Buffer.from(encryptedCode, 'base64url').toString('utf8');
    const bytes   = CryptoJS.AES.decrypt(base64, SECRET);
    const plain   = bytes.toString(CryptoJS.enc.Utf8);

    if (!plain.startsWith('MCDC:')) return null;

    const parts = plain.split(':');
    if (parts.length < 3) return null;

    const employeeId = parseInt(parts[1], 10);
    return isNaN(employeeId) ? null : employeeId;
  } catch {
    return null;
  }
}

module.exports = { generateEncryptedCode, decryptCode };
