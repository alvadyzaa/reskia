const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32;
const IV_LENGTH = 16;
const SALT_LENGTH = 32;
const TAG_LENGTH = 16;
const ITERATIONS = 100000;

function deriveKey(password, salt) {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, 'sha512');
}

async function encryptFile(inputPath, outputPath, password) {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = deriveKey(password, salt);

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const input = fs.createReadStream(inputPath);
  const output = fs.createWriteStream(outputPath);

  return new Promise((resolve, reject) => {
    // Write header: salt(32) + iv(16)
    output.write(salt);
    output.write(iv);

    input.pipe(cipher);

    cipher.on('data', (chunk) => output.write(chunk));
    cipher.on('end', () => {
      // Write auth tag at the end
      const tag = cipher.getAuthTag();
      output.write(tag);
      output.end();
    });

    output.on('finish', () => resolve(outputPath));
    output.on('error', reject);
    input.on('error', reject);
    cipher.on('error', reject);
  });
}

async function decryptFile(inputPath, outputPath, password) {
  const fileBuffer = fs.readFileSync(inputPath);

  if (fileBuffer.length < SALT_LENGTH + IV_LENGTH + TAG_LENGTH) {
    throw new Error('Encrypted file is too small or corrupted.');
  }

  const salt = fileBuffer.subarray(0, SALT_LENGTH);
  const iv = fileBuffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = fileBuffer.subarray(fileBuffer.length - TAG_LENGTH);
  const encrypted = fileBuffer.subarray(SALT_LENGTH + IV_LENGTH, fileBuffer.length - TAG_LENGTH);

  const key = deriveKey(password, salt);
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  try {
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    fs.writeFileSync(outputPath, decrypted);
    return outputPath;
  } catch (err) {
    throw new Error('Decryption failed. Wrong password or corrupted file.');
  }
}

module.exports = { encryptFile, decryptFile };
