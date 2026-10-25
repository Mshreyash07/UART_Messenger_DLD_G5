// End-to-end UART Messenger pipeline simulation
// Translates the exact cycle-by-cycle logic implemented in rtl/uart_top.v

import { chacha20EncryptBytes, chacha20DecryptBytes, parseHexToBytes } from "./chacha20";
import { encodeHamming, decodeHamming, packetizeHamming, depacketizeHamming, HammingDecodeResult } from "./hamming";

export interface PipelineByteStep {
  stage: "HEADER" | "PAYLOAD";
  byteIndexInPacket: number;
  byteName: string; // e.g. "SYNC0 (0xC3)", "NONCE[0]", "LENGTH_HI", "PAYLOAD[0]"
  rawByte: number; // The byte to be protected by Hamming
  isPlaintext: boolean;
  plaintextChar?: string;
  keystreamByte?: number;
  ciphertextByte?: number;

  // Hamming encoding
  codewordEncoded: number; // 13 bits

  // Packetizing into 2 UART bytes
  uartByteLowOriginal: number; // Byte 0: c[7:0]
  uartByteHighOriginal: number; // Byte 1: {000, c[12:8]}

  // Serial Channel (with possible injected noise)
  uartByteLowReceived: number;
  uartByteHighReceived: number;
  errorInjectedLow: boolean;
  errorInjectedHigh: boolean;

  // Depacketizing
  depacketizedCodeword: number;
  formatError: boolean;

  // Hamming decoding
  decodeResult: HammingDecodeResult;

  // Recovered byte
  recoveredPacketByte: number;
  recoveredPlaintextByte?: number;
  recoveredPlaintextChar?: string;
}

export interface PipelineSimulationResult {
  inputPlaintext: string;
  inputBytes: Uint8Array;
  keyHex: string;
  keyBytes: Uint8Array;
  noncePrefixHex: string;
  noncePrefixBytes: Uint8Array;
  nonceCounter: number;
  fullNonceHex: string;
  fullNonceBytes: Uint8Array;
  messageLength: number;

  // Cryptographic intermediate values
  ciphertextBytes: Uint8Array;
  keystreamBytes: Uint8Array;

  // 16-Byte Header bytes
  headerBytes: Uint8Array;

  // Complete packet bytes (Header + Ciphertext)
  packetBytes: Uint8Array;

  // Total UART bytes transmitted: 2 * packetBytes.length
  totalUartBytes: number;

  // Detailed step per packet byte
  steps: PipelineByteStep[];

  // Receiver parsing status
  syncFound: boolean;
  receivedNonceHex: string;
  receivedLength: number;
  receiverSingleErrorsCorrected: number;
  receiverDoubleErrorsDetected: number;
  receiverFormatErrorsDetected: number;
  receiverPacketError: boolean;
  recoveredPlaintext: string;
  recoveredBytes: Uint8Array;
  isPerfectMatch: boolean;
}

export interface InjectedError {
  packetByteIndex: number;
  uartByteTarget: "LOW" | "HIGH"; // 0 for low, 1 for high
  bitIndex: number; // 0 to 7
}

export function runPipelineSimulation(
  message: string,
  keyHex: string = "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
  noncePrefixHex: string = "A0A1A2A3A4A5A6A7",
  nonceCounter: number = 0,
  injectedErrors: InjectedError[] = []
): PipelineSimulationResult {
  const encoder = new TextEncoder();
  const inputBytes = encoder.encode(message);
  const messageLength = inputBytes.length;

  const keyBytes = parseHexToBytes(keyHex, 32);
  const noncePrefixBytes = parseHexToBytes(noncePrefixHex, 8);

  // Full 96-bit nonce = {nonce_prefix[63:0], nonce_counter[31:0]}
  const fullNonceBytes = new Uint8Array(12);
  fullNonceBytes.set(noncePrefixBytes.slice(0, 8), 0);
  fullNonceBytes[8] = (nonceCounter >>> 24) & 0xff;
  fullNonceBytes[9] = (nonceCounter >>> 16) & 0xff;
  fullNonceBytes[10] = (nonceCounter >>> 8) & 0xff;
  fullNonceBytes[11] = nonceCounter & 0xff;

  const fullNonceHex = Array.from(fullNonceBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Step 1: ChaCha20 encryption of payload
  const { ciphertext: ciphertextBytes, keystream: keystreamBytes } = chacha20EncryptBytes(
    inputBytes,
    keyBytes,
    fullNonceBytes,
    1 // initial counter = 1 as per uart_top.v
  );

  // Step 2: 16-byte Header formation
  // 0: 0xC3 (SYNC0)
  // 1: 0x5A (SYNC1)
  // 2-13: 12 Nonce bytes
  // 14: Length HI
  // 15: Length LO
  const headerBytes = new Uint8Array(16);
  headerBytes[0] = 0xc3;
  headerBytes[1] = 0x5a;
  headerBytes.set(fullNonceBytes, 2);
  headerBytes[14] = (messageLength >>> 8) & 0xff;
  headerBytes[15] = messageLength & 0xff;

  // Step 3: Complete Packet (Header + Ciphertext)
  const packetBytes = new Uint8Array(16 + messageLength);
  packetBytes.set(headerBytes, 0);
  packetBytes.set(ciphertextBytes, 16);

  // Step 4: Process every byte through Hamming Encoder, Packetizer, Channel, Depacketizer, Hamming Decoder
  const steps: PipelineByteStep[] = [];
  let receiverSingleErrorsCorrected = 0;
  let receiverDoubleErrorsDetected = 0;
  let receiverFormatErrorsDetected = 0;

  for (let i = 0; i < packetBytes.length; i++) {
    const isHeader = i < 16;
    const packetByte = packetBytes[i];

    let byteName = "";
    let isPlaintext = false;
    let plaintextChar: string | undefined = undefined;
    let keystreamByte: number | undefined = undefined;
    let ciphertextByte: number | undefined = undefined;

    if (i === 0) byteName = "SYNC0 (0xC3)";
    else if (i === 1) byteName = "SYNC1 (0x5A)";
    else if (i >= 2 && i <= 13) byteName = `NONCE[${i - 2}]`;
    else if (i === 14) byteName = "LENGTH_HI";
    else if (i === 15) byteName = "LENGTH_LO";
    else {
      const payloadIdx = i - 16;
      byteName = `PAYLOAD[${payloadIdx}]`;
      isPlaintext = true;
      plaintextChar = message[payloadIdx];
      keystreamByte = keystreamBytes[payloadIdx];
      ciphertextByte = ciphertextBytes[payloadIdx];
    }

    // Hamming Encode (13,8)
    const codewordEncoded = encodeHamming(packetByte);

    // Hamming Packetize into 2 UART bytes
    const [uartByteLowOriginal, uartByteHighOriginal] = packetizeHamming(codewordEncoded);

    // Apply any user-injected errors
    let uartByteLowReceived = uartByteLowOriginal;
    let uartByteHighReceived = uartByteHighOriginal;
    let errorInjectedLow = false;
    let errorInjectedHigh = false;

    for (const err of injectedErrors) {
      if (err.packetByteIndex === i) {
        if (err.uartByteTarget === "LOW") {
          uartByteLowReceived ^= 1 << err.bitIndex;
          errorInjectedLow = true;
        } else if (err.uartByteTarget === "HIGH") {
          uartByteHighReceived ^= 1 << err.bitIndex;
          errorInjectedHigh = true;
        }
      }
    }

    // Depacketize 2 UART bytes
    const { codeword: depacketizedCodeword, formatError } = depacketizeHamming(
      uartByteLowReceived,
      uartByteHighReceived
    );

    if (formatError) {
      receiverFormatErrorsDetected++;
    }

    // Hamming Decode
    const decodeResult = decodeHamming(depacketizedCodeword);

    if (decodeResult.singleErrorCorrected) {
      receiverSingleErrorsCorrected++;
    }
    if (decodeResult.doubleErrorDetected) {
      receiverDoubleErrorsDetected++;
    }

    const recoveredPacketByte = decodeResult.dataOut;

    steps.push({
      stage: isHeader ? "HEADER" : "PAYLOAD",
      byteIndexInPacket: i,
      byteName,
      rawByte: packetByte,
      isPlaintext,
      plaintextChar,
      keystreamByte,
      ciphertextByte,
      codewordEncoded,
      uartByteLowOriginal,
      uartByteHighOriginal,
      uartByteLowReceived,
      uartByteHighReceived,
      errorInjectedLow,
      errorInjectedHigh,
      depacketizedCodeword,
      formatError,
      decodeResult,
      recoveredPacketByte
    });
  }

  // Step 5: Receiver Packet Parsing & ChaCha20 Decryption
  // Verify Sync 0xC3, 0x5A
  const sync0 = steps[0].recoveredPacketByte === 0xc3;
  const sync1 = steps[1].recoveredPacketByte === 0x5a;
  const syncFound = sync0 && sync1;

  // Reconstruct received Nonce
  const receivedNonceBytes = new Uint8Array(12);
  for (let j = 0; j < 12; j++) {
    receivedNonceBytes[j] = steps[2 + j].recoveredPacketByte;
  }
  const receivedNonceHex = Array.from(receivedNonceBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Reconstruct received Length
  const receivedLength = (steps[14].recoveredPacketByte << 8) | steps[15].recoveredPacketByte;

  // Collect recovered ciphertext bytes
  const recoveredCiphertext = new Uint8Array(messageLength);
  for (let j = 0; j < messageLength; j++) {
    recoveredCiphertext[j] = steps[16 + j].recoveredPacketByte;
  }

  // Decrypt with received nonce
  const { plaintext: recoveredPlaintextBytes } = chacha20DecryptBytes(
    recoveredCiphertext,
    keyBytes,
    receivedNonceBytes,
    1
  );

  const decoder = new TextDecoder("utf-8", { fatal: false });
  const recoveredPlaintext = decoder.decode(recoveredPlaintextBytes);

  // Populate recovered plaintext per payload step
  for (let j = 0; j < messageLength; j++) {
    steps[16 + j].recoveredPlaintextByte = recoveredPlaintextBytes[j];
    steps[16 + j].recoveredPlaintextChar = recoveredPlaintext[j] || "?";
  }

  const receiverPacketError =
    receiverDoubleErrorsDetected > 0 ||
    receiverFormatErrorsDetected > 0 ||
    !syncFound ||
    receivedLength !== messageLength;

  const isPerfectMatch = recoveredPlaintext === message && !receiverPacketError;

  return {
    inputPlaintext: message,
    inputBytes,
    keyHex,
    keyBytes,
    noncePrefixHex,
    noncePrefixBytes,
    nonceCounter,
    fullNonceHex,
    fullNonceBytes,
    messageLength,
    ciphertextBytes,
    keystreamBytes,
    headerBytes,
    packetBytes,
    totalUartBytes: packetBytes.length * 2,
    steps,
    syncFound,
    receivedNonceHex,
    receivedLength,
    receiverSingleErrorsCorrected,
    receiverDoubleErrorsDetected,
    receiverFormatErrorsDetected,
    receiverPacketError,
    recoveredPlaintext,
    recoveredBytes: recoveredPlaintextBytes,
    isPerfectMatch
  };
}
