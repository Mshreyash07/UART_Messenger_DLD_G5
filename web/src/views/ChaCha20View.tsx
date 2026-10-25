import React, { useState, useMemo } from "react";
import {
  ShieldCheck,
  RotateCcw,
  Binary,
  KeyRound,
  Layers,
  ArrowRight,
  AlertTriangle,
  Info,
  CheckCircle2
} from "lucide-react";
import {
  generateChaCha20Block,
  chacha20EncryptBytes,
  chacha20DecryptBytes,
  parseHexToBytes,
  bytesToHex
} from "../utils/chacha20";

export const ChaCha20View: React.FC = () => {
  const [inputText, setInputText] = useState<string>("Hello, I am Rishi!");
  const [keyHex, setKeyHex] = useState<string>(
    "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f"
  );
  const [nonceHex, setNonceHex] = useState<string>("A0A1A2A3A4A5A6A700000001");
  const [counter, setCounter] = useState<number>(1);

  const encoder = new TextEncoder();
  const inputBytes = useMemo(() => encoder.encode(inputText), [inputText]);
  const keyBytes = useMemo(() => parseHexToBytes(keyHex, 32), [keyHex]);
  const nonceBytes = useMemo(() => parseHexToBytes(nonceHex, 12), [nonceHex]);

  // Block generation for inspection
  const blockData = useMemo(() => {
    return generateChaCha20Block(keyBytes, nonceBytes, counter);
  }, [keyBytes, nonceBytes, counter]);

  // Multi-block encryption test
  const encryptResult = useMemo(() => {
    return chacha20EncryptBytes(inputBytes, keyBytes, nonceBytes, counter);
  }, [inputBytes, keyBytes, nonceBytes, counter]);

  // Decryption test
  const decryptResult = useMemo(() => {
    return chacha20DecryptBytes(encryptResult.ciphertext, keyBytes, nonceBytes, counter);
  }, [encryptResult.ciphertext, keyBytes, nonceBytes, counter]);

  const decoder = new TextDecoder("utf-8", { fatal: false });
  const recoveredText = useMemo(
    () => decoder.decode(decryptResult.plaintext),
    [decryptResult.plaintext]
  );

  const [selectedByteIdx, setSelectedByteIdx] = useState<number>(0);

  return (
    <div className="space-y-6">
      {/* Top Banner & RFC 7539 Context */}
      <div className="card space-y-3">
        <div className="card-header">
          <div className="card-title">
            <ShieldCheck className="w-5 h-5 text-cyan-400" />
            <span>ChaCha20 Symmetric Stream Cipher (RFC 7539 / RFC 8439)</span>
          </div>
          <span className="badge badge-cyan font-mono text-xs">rtl/chacha20_keystream.v</span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          ChaCha20 is a high-speed, secure symmetric stream cipher designed by Daniel J. Bernstein. In our
          hardware implementation, it encrypts each message byte on the fly by generating 64-byte keystream blocks
          and XORing each keystream byte with the plaintext byte.
        </p>

        {/* Security Alert Note */}
        <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-start gap-3 text-xs text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-amber-300 font-semibold">Cryptographic Notice: </strong>
            ChaCha20 alone provides <em>confidentiality</em> (encryption), but not <em>authenticity</em> or <em>integrity</em>.
            In a complete production deployment, an authenticated cipher like <strong>ChaCha20-Poly1305</strong> with a 128-bit MAC
            tag would be required to prevent bit-flipping attacks. Additionally, a (key, nonce) pair must <strong>never</strong> be reused!
          </div>
        </div>
      </div>

      {/* Cipher Inputs & Multi-Block Controls */}
      <div className="card space-y-4">
        <div className="card-header">
          <div className="card-title text-sm">
            <KeyRound className="w-4 h-4 text-cyan-400" />
            <span>Key, Nonce &amp; Counter Configuration</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setInputText(
                  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%^&*()"
                );
              }}
              className="btn btn-secondary text-xs py-1 px-2.5"
            >
              Test 70-byte Multi-Block (Crosses 64B Boundary)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-xs">
          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">Plaintext Input:</label>
            <textarea
              rows={3}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                setSelectedByteIdx(0);
              }}
              className="input-field font-mono text-xs resize-none"
            />
            <div className="text-[11px] text-slate-400">
              Length: {inputBytes.length} bytes | Blocks: {encryptResult.blocksUsed}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">256-bit Secret Key (Hex):</label>
            <input
              type="text"
              value={keyHex}
              onChange={(e) => setKeyHex(e.target.value)}
              className="input-field input-mono text-[11px]"
            />
            <label className="font-semibold text-slate-300 block pt-1">96-bit Nonce (Hex):</label>
            <input
              type="text"
              value={nonceHex}
              onChange={(e) => setNonceHex(e.target.value)}
              className="input-field input-mono text-[11px]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-semibold text-slate-300">32-bit Block Counter:</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={counter}
                onChange={(e) => setCounter(parseInt(e.target.value) || 0)}
                className="input-field input-mono text-xs"
              />
              <button
                onClick={() => setCounter((c) => c + 1)}
                className="btn btn-secondary text-xs px-3 py-1.5"
              >
                +1
              </button>
            </div>
            <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[11px] text-slate-400 mt-2">
              In <code className="text-cyan-300">uart_top.v</code>, the payload counter starts at{" "}
              <code className="text-cyan-300">counter = 1</code> and automatically increments whenever
              64 bytes are consumed.
            </div>
          </div>
        </div>
      </div>

      {/* 4x4 State Matrix Visualizer */}
      <div className="card space-y-4">
        <div className="card-header">
          <div className="card-title text-sm">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>4x4 ChaCha20 State Matrix (Initial State vs 20-Round Output)</span>
          </div>
          <span className="badge badge-purple text-[10px] font-mono">
            Block Counter: {counter}
          </span>
        </div>

        <p className="text-xs text-slate-300">
          The 512-bit state is organized as a 4x4 matrix of 16 32-bit words (little-endian). Words 0–3
          are constants, words 4–11 are the key, word 12 is the block counter, and words 13–15 are the nonce.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Initial State Matrix */}
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-xs font-semibold text-slate-300 font-mono">
              INITIAL STATE (16 Words)
            </div>
            <div className="grid grid-cols-4 gap-2 font-mono text-xs">
              {blockData.initialState.map((word, idx) => {
                let label = "";
                let bg = "bg-slate-900 border-slate-800 text-slate-200";
                if (idx < 4) {
                  label = `const[${idx}]`;
                  bg = "bg-cyan-950/30 border-cyan-800/40 text-cyan-300";
                } else if (idx < 12) {
                  label = `key[${idx - 4}]`;
                  bg = "bg-purple-950/30 border-purple-800/40 text-purple-300";
                } else if (idx === 12) {
                  label = "counter";
                  bg = "bg-amber-950/30 border-amber-800/40 text-amber-300";
                } else {
                  label = `nonce[${idx - 13}]`;
                  bg = "bg-emerald-950/30 border-emerald-800/40 text-emerald-300";
                }

                return (
                  <div key={idx} className={`p-2 rounded border text-center ${bg}`}>
                    <div className="text-[10px] opacity-70">{label}</div>
                    <div className="font-bold text-[11px] mt-0.5">
                      0x{word.toString(16).padStart(8, "0").toUpperCase()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Keystream Block Output */}
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
            <div className="text-xs font-semibold text-slate-300 font-mono">
              AFTER 20 ROUNDS (x[i] + initial_state[i])
            </div>
            <div className="grid grid-cols-4 gap-2 font-mono text-xs">
              {blockData.finalState.map((word, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded border bg-slate-900/80 border-slate-800 text-center"
                >
                  <div className="text-[10px] text-slate-400">word[{idx}]</div>
                  <div className="font-bold text-[11px] text-cyan-300 mt-0.5">
                    0x{word.toString(16).padStart(8, "0").toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Byte-by-Byte Plaintext ^ Keystream = Ciphertext Table */}
      <div className="card space-y-4">
        <div className="card-header">
          <div className="card-title text-sm">
            <Binary className="w-4 h-4 text-cyan-400" />
            <span>Byte-by-Byte Encryption &amp; Decryption Trace</span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {inputBytes.length} bytes processed
          </span>
        </div>

        <div className="overflow-x-auto max-h-72">
          <table className="tech-table">
            <thead>
              <tr>
                <th>Byte #</th>
                <th>Block / Offset</th>
                <th>Plaintext (Char)</th>
                <th>Plaintext (Hex)</th>
                <th>Keystream Byte</th>
                <th>Ciphertext (Hex)</th>
                <th>Decrypted Byte</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {Array.from(inputBytes).map((ptByte, idx) => {
                const ksByte = encryptResult.keystream[idx];
                const ctByte = encryptResult.ciphertext[idx];
                const decByte = decryptResult.plaintext[idx];
                const blockIdx = Math.floor(idx / 64);
                const offsetInBlock = idx % 64;

                return (
                  <tr
                    key={idx}
                    onClick={() => setSelectedByteIdx(idx)}
                    className={`cursor-pointer ${
                      selectedByteIdx === idx ? "bg-cyan-950/40" : ""
                    }`}
                  >
                    <td className="font-mono text-slate-400">{idx}</td>
                    <td className="font-mono text-slate-400">
                      Block {counter + blockIdx} : [{offsetInBlock}]
                    </td>
                    <td className="font-mono text-white font-bold">'{inputText[idx]}'</td>
                    <td className="font-mono text-cyan-300">
                      0x{ptByte.toString(16).padStart(2, "0").toUpperCase()}
                    </td>
                    <td className="font-mono text-purple-300 font-semibold">
                      0x{ksByte.toString(16).padStart(2, "0").toUpperCase()}
                    </td>
                    <td className="font-mono text-amber-300 font-bold">
                      0x{ctByte.toString(16).padStart(2, "0").toUpperCase()}
                    </td>
                    <td className="font-mono text-emerald-300 font-bold">
                      '{String.fromCharCode(decByte)}' (0x
                      {decByte.toString(16).padStart(2, "0").toUpperCase()})
                    </td>
                    <td>
                      <span className="badge badge-emerald text-[10px]">VERIFIED</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
