// Extended Hamming SECDED (13,8) implementation
// Exactly matching rtl/hamming_encoder.v, rtl/hamming_decoder.v,
// rtl/hamming_packetizer.v, and rtl/hamming_depacketizer.v

export interface CodewordBitDetail {
  index: number; // 0 to 12
  hammingPos: number; // 1 to 13
  type: "data" | "parity" | "overall_parity";
  dataBitIndex?: number; // 0 to 7
  parityName: string; // "p1", "p2", "p4", "p8", "p_overall", "d0".."d7"
  equation: string;
  value: number; // 0 or 1
}

export interface HammingDecodeResult {
  codewordIn: number; // 13 bits
  syndrome: number; // 4 bits [s3, s2, s1, s0]
  syndromeBits: [number, number, number, number]; // [s0, s1, s2, s3]
  overallParity: number; // 0 or 1 (^codewordIn)
  singleErrorCorrected: boolean;
  doubleErrorDetected: boolean;
  noError: boolean;
  correctedBitIndex: number | null; // 0 to 12 if corrected
  correctedCodeword: number;
  dataOut: number; // 8 bits
  status: "NO_ERROR" | "SINGLE_ERROR_CORRECTED" | "DOUBLE_ERROR_DETECTED";
  explanation: string;
}

/**
 * Encodes an 8-bit byte into a 13-bit extended Hamming codeword.
 * Direct translation of rtl/hamming_encoder.v
 */
export function encodeHamming(dataIn: number): number {
  const d = dataIn & 0xff;
  let c = 0;

  // Data bit mapping
  const d0 = (d >> 0) & 1; // codeword_out[2]
  const d1 = (d >> 1) & 1; // codeword_out[4]
  const d2 = (d >> 2) & 1; // codeword_out[5]
  const d3 = (d >> 3) & 1; // codeword_out[6]
  const d4 = (d >> 4) & 1; // codeword_out[8]
  const d5 = (d >> 5) & 1; // codeword_out[9]
  const d6 = (d >> 6) & 1; // codeword_out[10]
  const d7 = (d >> 7) & 1; // codeword_out[11]

  c |= d0 << 2;
  c |= d1 << 4;
  c |= d2 << 5;
  c |= d3 << 6;
  c |= d4 << 8;
  c |= d5 << 9;
  c |= d6 << 10;
  c |= d7 << 11;

  // Parity bit calculations
  // p1 (c[0]) = c[2] ^ c[4] ^ c[6] ^ c[8] ^ c[10]
  const p1 = d0 ^ d1 ^ d3 ^ d4 ^ d6;
  c |= p1 << 0;

  // p2 (c[1]) = c[2] ^ c[5] ^ c[6] ^ c[9] ^ c[10]
  const p2 = d0 ^ d2 ^ d3 ^ d5 ^ d6;
  c |= p2 << 1;

  // p4 (c[3]) = c[4] ^ c[5] ^ c[6] ^ c[11]
  const p4 = d1 ^ d2 ^ d3 ^ d7;
  c |= p4 << 3;

  // p8 (c[7]) = c[8] ^ c[9] ^ c[10] ^ c[11]
  const p8 = d4 ^ d5 ^ d6 ^ d7;
  c |= p8 << 7;

  // Overall parity bit c[12] = ^c[11:0]
  let lowerParity = 0;
  for (let i = 0; i < 12; i++) {
    lowerParity ^= (c >> i) & 1;
  }
  c |= lowerParity << 12;

  return c & 0x1fff;
}

/**
 * Returns breakdown of all 13 bits of an encoded codeword
 */
export function getCodewordDetails(dataIn: number): CodewordBitDetail[] {
  const codeword = encodeHamming(dataIn);
  const details: CodewordBitDetail[] = [
    {
      index: 0,
      hammingPos: 1,
      type: "parity",
      parityName: "p1",
      equation: "c[2] ^ c[4] ^ c[6] ^ c[8] ^ c[10]",
      value: (codeword >> 0) & 1
    },
    {
      index: 1,
      hammingPos: 2,
      type: "parity",
      parityName: "p2",
      equation: "c[2] ^ c[5] ^ c[6] ^ c[9] ^ c[10]",
      value: (codeword >> 1) & 1
    },
    {
      index: 2,
      hammingPos: 3,
      type: "data",
      dataBitIndex: 0,
      parityName: "d0",
      equation: "data_in[0]",
      value: (codeword >> 2) & 1
    },
    {
      index: 3,
      hammingPos: 4,
      type: "parity",
      parityName: "p4",
      equation: "c[4] ^ c[5] ^ c[6] ^ c[11]",
      value: (codeword >> 3) & 1
    },
    {
      index: 4,
      hammingPos: 5,
      type: "data",
      dataBitIndex: 1,
      parityName: "d1",
      equation: "data_in[1]",
      value: (codeword >> 4) & 1
    },
    {
      index: 5,
      hammingPos: 6,
      type: "data",
      dataBitIndex: 2,
      parityName: "d2",
      equation: "data_in[2]",
      value: (codeword >> 5) & 1
    },
    {
      index: 6,
      hammingPos: 7,
      type: "data",
      dataBitIndex: 3,
      parityName: "d3",
      equation: "data_in[3]",
      value: (codeword >> 6) & 1
    },
    {
      index: 7,
      hammingPos: 8,
      type: "parity",
      parityName: "p8",
      equation: "c[8] ^ c[9] ^ c[10] ^ c[11]",
      value: (codeword >> 7) & 1
    },
    {
      index: 8,
      hammingPos: 9,
      type: "data",
      dataBitIndex: 4,
      parityName: "d4",
      equation: "data_in[4]",
      value: (codeword >> 8) & 1
    },
    {
      index: 9,
      hammingPos: 10,
      type: "data",
      dataBitIndex: 5,
      parityName: "d5",
      equation: "data_in[5]",
      value: (codeword >> 9) & 1
    },
    {
      index: 10,
      hammingPos: 11,
      type: "data",
      dataBitIndex: 6,
      parityName: "d6",
      equation: "data_in[6]",
      value: (codeword >> 10) & 1
    },
    {
      index: 11,
      hammingPos: 12,
      type: "data",
      dataBitIndex: 7,
      parityName: "d7",
      equation: "data_in[7]",
      value: (codeword >> 11) & 1
    },
    {
      index: 12,
      hammingPos: 13,
      type: "overall_parity",
      parityName: "p_all",
      equation: "^c[11:0] (Overall Parity)",
      value: (codeword >> 12) & 1
    }
  ];

  return details;
}

/**
 * Decodes a 13-bit codeword, calculates syndrome and parity,
 * corrects single bit errors and flags double bit errors.
 * Direct translation of rtl/hamming_decoder.v
 */
export function decodeHamming(codewordIn: number): HammingDecodeResult {
  const c = codewordIn & 0x1fff;

  // Syndrome computation
  const s0 =
    ((c >> 0) & 1) ^
    ((c >> 2) & 1) ^
    ((c >> 4) & 1) ^
    ((c >> 6) & 1) ^
    ((c >> 8) & 1) ^
    ((c >> 10) & 1);

  const s1 =
    ((c >> 1) & 1) ^
    ((c >> 2) & 1) ^
    ((c >> 5) & 1) ^
    ((c >> 6) & 1) ^
    ((c >> 9) & 1) ^
    ((c >> 10) & 1);

  const s2 =
    ((c >> 3) & 1) ^
    ((c >> 4) & 1) ^
    ((c >> 5) & 1) ^
    ((c >> 6) & 1) ^
    ((c >> 11) & 1);

  const s3 =
    ((c >> 7) & 1) ^
    ((c >> 8) & 1) ^
    ((c >> 9) & 1) ^
    ((c >> 10) & 1) ^
    ((c >> 11) & 1);

  const syndrome = (s0 | (s1 << 1) | (s2 << 2) | (s3 << 3)) & 0xf;

  // Overall parity = XOR of all 13 bits
  let overallParity = 0;
  for (let i = 0; i < 13; i++) {
    overallParity ^= (c >> i) & 1;
  }

  let correctedCodeword = c;
  let singleErrorCorrected = false;
  let doubleErrorDetected = false;
  let correctedBitIndex: number | null = null;
  let status: "NO_ERROR" | "SINGLE_ERROR_CORRECTED" | "DOUBLE_ERROR_DETECTED" = "NO_ERROR";
  let explanation = "Codeword received with valid parity and zero syndrome. No transmission error.";

  if (syndrome === 0 && overallParity === 0) {
    // Clean: No errors
    correctedCodeword = c;
    status = "NO_ERROR";
  } else if (syndrome !== 0 && overallParity === 1) {
    // Single bit error in Hamming bits 1 to 12
    if (syndrome >= 1 && syndrome <= 12) {
      correctedBitIndex = syndrome - 1;
      correctedCodeword ^= 1 << correctedBitIndex;
      singleErrorCorrected = true;
      status = "SINGLE_ERROR_CORRECTED";
      explanation = `Single-bit error detected at codeword bit index [${correctedBitIndex}] (Hamming pos ${syndrome}). Bit flipped to restore original codeword.`;
    } else {
      doubleErrorDetected = true;
      status = "DOUBLE_ERROR_DETECTED";
      explanation = `Syndrome ${syndrome} out of valid range (1-12) with odd parity. Corrupted transmission.`;
    }
  } else if (syndrome === 0 && overallParity === 1) {
    // Error in overall parity bit (bit 12)
    correctedBitIndex = 12;
    correctedCodeword ^= 1 << 12;
    singleErrorCorrected = true;
    status = "SINGLE_ERROR_CORRECTED";
    explanation = "Single-bit error detected in overall parity bit c[12]. Corrected without affecting payload data.";
  } else {
    // syndrome != 0 && overallParity == 0 => Double bit error!
    doubleErrorDetected = true;
    status = "DOUBLE_ERROR_DETECTED";
    explanation = `Double-bit error detected (Syndrome: 0x${syndrome.toString(16).toUpperCase()}, Overall Parity: 0). SECDED detected the fault; cannot reliably correct.`;
  }

  // Extract data byte from corrected codeword if not double error
  let dataOut = 0;
  if (!doubleErrorDetected) {
    const bit11 = (correctedCodeword >> 11) & 1; // d7
    const bit10 = (correctedCodeword >> 10) & 1; // d6
    const bit9 = (correctedCodeword >> 9) & 1; // d5
    const bit8 = (correctedCodeword >> 8) & 1; // d4
    const bit6 = (correctedCodeword >> 6) & 1; // d3
    const bit5 = (correctedCodeword >> 5) & 1; // d2
    const bit4 = (correctedCodeword >> 4) & 1; // d1
    const bit2 = (correctedCodeword >> 2) & 1; // d0

    dataOut =
      (bit2 << 0) |
      (bit4 << 1) |
      (bit5 << 2) |
      (bit6 << 3) |
      (bit8 << 4) |
      (bit9 << 5) |
      (bit10 << 6) |
      (bit11 << 7);
  }

  return {
    codewordIn: c,
    syndrome,
    syndromeBits: [s0, s1, s2, s3],
    overallParity,
    singleErrorCorrected,
    doubleErrorDetected,
    noError: !singleErrorCorrected && !doubleErrorDetected,
    correctedBitIndex,
    correctedCodeword,
    dataOut,
    status,
    explanation
  };
}

/**
 * Splits 13-bit codeword into two 8-bit UART bytes.
 * Matches rtl/hamming_packetizer.v
 */
export function packetizeHamming(codeword: number): [number, number] {
  const c = codeword & 0x1fff;
  const byte0 = c & 0xff; // saved_codeword[7:0]
  const byte1 = (c >> 8) & 0x1f; // {3'b000, saved_codeword[12:8]}
  return [byte0, byte1];
}

/**
 * Reassembles two 8-bit UART bytes into a 13-bit codeword,
 * checking format error on padding bits.
 * Matches rtl/hamming_depacketizer.v
 */
export function depacketizeHamming(
  byte0: number,
  byte1: number
): { codeword: number; formatError: boolean } {
  // Check format error: byte1 top 3 bits must be 0
  const formatError = (byte1 & 0xe0) !== 0;
  const codeword = (byte0 & 0xff) | ((byte1 & 0x1f) << 8);
  return { codeword: codeword & 0x1fff, formatError };
}
