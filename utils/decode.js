const inputFile = process.argv.length > 2 ? process.argv[2] : './encrypted.sr';
const keyFile = '../privkey-2023-03-28.pem';
const outputFileRaw = './decrypted.pcm';
const outputFile = './decrypted.wav';

const { OpusEncoder } = require('@discordjs/opus');
const crypto = require('crypto');
const execSync = require('child_process').execSync;
const fs = require('fs');

// Crypto configuration
const aesKeyLength = 32;
const aesIVLength = 16;
const aesBlockLength = 16;
const headerLengthBytes = 2;

// Load data and RSA private key
const privateKey = fs.readFileSync(keyFile);
const rawData = fs.readFileSync(inputFile);

// Decrypt header
const headerLength = rawData.slice(0, headerLengthBytes).readInt16LE();
const headerEncrypted = rawData.slice(headerLengthBytes, headerLengthBytes + headerLength);
const headerDecrypted = crypto.privateDecrypt(
  {
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
  },
  headerEncrypted,
);

// Prepare AES decipher
const aesKey = headerDecrypted.slice(0, aesKeyLength);
const aesIV = headerDecrypted.slice(aesKeyLength);
const decipher = crypto.createDecipheriv('aes-256-cbc', aesKey, aesIV);
decipher.setAutoPadding(false);

const payloadLength = rawData.length - headerLengthBytes - headerLength;
if (payloadLength % 16 !== 0) {
  console.error('[ERROR] Payload length mismatch, must be divisible by 16')
  process.exit();
}

// Decrypt raw OPUS data
const opusRAW = Buffer.alloc(payloadLength);
const startIndex = headerLengthBytes + headerLength;
let index = startIndex;
while (index < rawData.length) {
  const blockEncrypted = rawData.slice(index, index + aesBlockLength);
  const blockDecrypted = decipher.update(blockEncrypted);
  blockDecrypted.copy(opusRAW, index - startIndex);
  index += aesBlockLength;
}

// Get OPUS packets
const opusPackets = [];
index = 0;
while (index < payloadLength) {
  const header = opusRAW.slice(index, index + headerLengthBytes).readInt16LE();
  const paddingLength = (header & 0xf000) >> 12;
  const packetLength = (header & 0x0fff);

  opusPackets.push(opusRAW.slice(index + headerLengthBytes, index + headerLengthBytes + packetLength));

  index += headerLengthBytes + paddingLength + packetLength;
}
if (index !== payloadLength) {
  console.error('[ERROR] Packet length mismatch');
  process.exit();
}

// TODO: figure out a proper way to put OPUS packets into OGG envelope without decoding and using FFMPEG
// Write raw data
// fs.writeFileSync(outputFile, Buffer.from([
//   0x4F, 0x70, 0x75, 0x73, 0x48, 0x65, 0x61, 0x64,
//   0x01, 0x01, 0x00, 0x00, 0x80, 0xbb, 0x00, 0x00,
//   0x00, 0x00, 0x00,
//   0x4F, 0x70, 0x75, 0x73, 0x54, 0x61, 0x67, 0x73,
//   0x00, 0x00,
// ]));
// opusPackets.forEach(packet => {
//   fs.appendFileSync(outputFile, packet);
// });

// Decode OPUS packets
const encoder = new OpusEncoder(48000, 1);
fs.writeFileSync(outputFileRaw, '');
opusPackets.forEach(packet => {
  const decoded = encoder.decode(packet);
  fs.appendFileSync(outputFileRaw, decoded);
});

// Convert raw PCM data into wav file with FFMPEG
if (fs.existsSync(outputFile)) {
  fs.unlinkSync(outputFile);
}
execSync(`ffmpeg -f s16le -ar 48.0k -ac 1 -i ${outputFileRaw} ${outputFile}`);
fs.unlinkSync(outputFileRaw);
