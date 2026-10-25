// RFC 7539 / RFC 8439 ChaCha20 Implementation matching rtl/chacha20_keystream.v

export interface ChaChaStateMatrix {
  matrix: number[][]; // 4x4 array of 32-bit unsigned integers
  description: string;
}

export interface QuarterRoundStep {
  name: string;
  indices: [number, number, number, number];
  before: number[];
  after: number[];
}

function rotl(v: number, c: number): number {
  return ((v << c) | (v >>> (32 - c))) >>> 0;
}

function quarterRound(a: number, b: number, c: number, d: number): [number, number, number, number] {
  a = (a + b) >>> 0;
  d = rotl(d ^ a, 16);

  c = (c + d) >>> 0;
  b = rotl(b ^ c, 12);

  a = (a + b) >>> 0;
  d = rotl(d ^ a, 8);

  c = (c + d) >>> 0;
  b = rotl(b ^ c, 7);

  return [a, b, c, d];
}

// Convert byte array (little-endian) to 32-bit uint
export function bytesToWordLe(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] |
      (bytes[offset + 1] << 8) |
      (bytes[offset + 2] << 16) |
      (bytes[offset + 3] << 24)) >>>
    0
  );
}

// Convert 32-bit uint to 4 bytes (little-endian)
export function wordToBytesLe(word: number): Uint8Array {
  const bytes = new Uint8Array(4);
  bytes[0] = word & 0xff;
  bytes[1] = (word >>> 8) & 0xff;
  bytes[2] = (word >>> 16) & 0xff;
  bytes[3] = (word >>> 24) & 0xff;
  return bytes;
}

export function parseHexToBytes(hex: string, expectedLength?: number): Uint8Array {
  const cleanHex = hex.replace(/[^0-9a-fA-F]/g, "");
  const byteCount = Math.floor(cleanHex.length / 2);
  const result = new Uint8Array(expectedLength !== undefined ? expectedLength : byteCount);
  for (let i = 0; i < byteCount; i++) {
    if (expectedLength !== undefined && i >= expectedLength) break;
    result[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return result;
}

export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generateChaCha20Block(
  keyBytes: Uint8Array, // 32 bytes
  nonceBytes: Uint8Array, // 12 bytes
  counter: number // 32-bit uint
): {
  initialState: number[];
  finalState: number[];
  keystreamBlock: Uint8Array;
} {
  const state = new Array<number>(16);

  // Constants "expand 32-byte k"
  // Little-endian ASCII:
  // "expa" = 0x61707865
  // "nd 3" = 0x3320646e
  // "2-by" = 0x79622d32
  // "te k" = 0x6b206574
  state[0] = 0x61707865;
  state[1] = 0x3320646e;
  state[2] = 0x79622d32;
  state[3] = 0x6b206574;

  // 8 Key words (little-endian)
  for (let i = 0; i < 8; i++) {
    state[4 + i] = bytesToWordLe(keyBytes, i * 4);
  }

  // Counter
  state[12] = counter >>> 0;

  // 3 Nonce words (little-endian)
  state[13] = bytesToWordLe(nonceBytes, 0);
  state[14] = bytesToWordLe(nonceBytes, 4);
  state[15] = bytesToWordLe(nonceBytes, 8);

  const initialState = [...state];
  const workingState = [...state];

  // 20 rounds (10 double rounds)
  for (let i = 0; i < 10; i++) {
    // Column rounds
    [workingState[0], workingState[4], workingState[8], workingState[12]] = quarterRound(
      workingState[0],
      workingState[4],
      workingState[8],
      workingState[12]
    );
    [workingState[1], workingState[5], workingState[9], workingState[13]] = quarterRound(
      workingState[1],
      workingState[5],
      workingState[9],
      workingState[13]
    );
    [workingState[2], workingState[6], workingState[10], workingState[14]] = quarterRound(
      workingState[2],
      workingState[6],
      workingState[10],
      workingState[14]
    );
    [workingState[3], workingState[7], workingState[11], workingState[15]] = quarterRound(
      workingState[3],
      workingState[7],
      workingState[11],
      workingState[15]
    );

    // Diagonal rounds
    [workingState[0], workingState[5], workingState[10], workingState[15]] = quarterRound(
      workingState[0],
      workingState[5],
      workingState[10],
      workingState[15]
    );
    [workingState[1], workingState[6], workingState[11], workingState[12]] = quarterRound(
      workingState[1],
      workingState[6],
      workingState[11],
      workingState[12]
    );
    [workingState[2], workingState[7], workingState[8], workingState[13]] = quarterRound(
      workingState[2],
      workingState[7],
      workingState[8],
      workingState[13]
    );
    [workingState[3], workingState[4], workingState[9], workingState[14]] = quarterRound(
      workingState[3],
      workingState[4],
      workingState[9],
      workingState[14]
    );
  }

  // Add initial state
  const finalState = new Array<number>(16);
  const keystreamBlock = new Uint8Array(64);

  for (let i = 0; i < 16; i++) {
    finalState[i] = (workingState[i] + initialState[i]) >>> 0;
    const wordBytes = wordToBytesLe(finalState[i]);
    keystreamBlock.set(wordBytes, i * 4);
  }

  return { initialState, finalState, keystreamBlock };
}

export function chacha20EncryptBytes(
  plaintext: Uint8Array,
  keyBytes: Uint8Array,
  nonceBytes: Uint8Array,
  initialCounter: number = 1
): {
  ciphertext: Uint8Array;
  keystream: Uint8Array;
  blocksUsed: number;
} {
  const len = plaintext.length;
  const ciphertext = new Uint8Array(len);
  const keystream = new Uint8Array(len);

  const numBlocks = Math.ceil(len / 64) || 1;
  let byteOffset = 0;

  for (let blockIdx = 0; blockIdx < numBlocks; blockIdx++) {
    const counter = (initialCounter + blockIdx) >>> 0;
    const { keystreamBlock } = generateChaCha20Block(keyBytes, nonceBytes, counter);

    const bytesToProcess = Math.min(64, len - byteOffset);
    for (let i = 0; i < bytesToProcess; i++) {
      const ksByte = keystreamBlock[i];
      keystream[byteOffset + i] = ksByte;
      ciphertext[byteOffset + i] = plaintext[byteOffset + i] ^ ksByte;
    }
    byteOffset += bytesToProcess;
  }

  return { ciphertext, keystream, blocksUsed: numBlocks };
}

export function chacha20DecryptBytes(
  ciphertext: Uint8Array,
  keyBytes: Uint8Array,
  nonceBytes: Uint8Array,
  initialCounter: number = 1
): {
  plaintext: Uint8Array;
  keystream: Uint8Array;
} {
  // Symmetric XOR decryption
  const { ciphertext: plaintext, keystream } = chacha20EncryptBytes(
    ciphertext,
    keyBytes,
    nonceBytes,
    initialCounter
  );
  return { plaintext, keystream };
}
