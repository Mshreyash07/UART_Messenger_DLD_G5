import React, { useState, useMemo } from "react";
import {
  Binary,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
  Bug,
  HelpCircle,
  ArrowRight
} from "lucide-react";
import {
  encodeHamming,
  decodeHamming,
  getCodewordDetails,
  CodewordBitDetail,
  HammingDecodeResult
} from "../utils/hamming";

export const HammingView: React.FC = () => {
  const [dataByte, setDataByte] = useState<number>(0xa5); // 0xA5 = 10100101
  const [errorMask, setErrorMask] = useState<number>(0); // 13-bit error mask

  // Encoded baseline codeword (clean)
  const cleanCodeword = useMemo(() => encodeHamming(dataByte), [dataByte]);

  // Received codeword with injected error mask
  const receivedCodeword = useMemo(
    () => (cleanCodeword ^ errorMask) & 0x1fff,
    [cleanCodeword, errorMask]
  );

  // Decoder execution
  const decodeResult = useMemo<HammingDecodeResult>(
    () => decodeHamming(receivedCodeword),
    [receivedCodeword]
  );

  // Bit breakdown details
  const codewordDetails = useMemo<CodewordBitDetail[]>(
    () => getCodewordDetails(dataByte),
    [dataByte]
  );

  const errorBitsCount = useMemo(() => {
    let count = 0;
    for (let i = 0; i < 13; i++) {
      if ((errorMask >> i) & 1) count++;
    }
    return count;
  }, [errorMask]);

  const toggleBitFlip = (bitIndex: number) => {
    setErrorMask((prev) => prev ^ (1 << bitIndex));
  };

  const handleInjectDoubleError = () => {
    // Inject flips at bit 2 (d0) and bit 4 (d1)
    setErrorMask((1 << 2) | (1 << 4));
  };

  const handleClearErrors = () => {
    setErrorMask(0);
  };

  return (
    <div className="space-y-6">
      {/* Overview & RTL Alignment Notice */}
      <div className="card space-y-3">
        <div className="card-header">
          <div className="card-title">
            <Binary className="w-5 h-5 text-cyan-400" />
            <span>Extended Hamming (13,8) SECDED Interactive Playground</span>
          </div>
          <span className="badge badge-emerald font-mono text-xs">
            rtl/hamming_encoder.v &amp; rtl/hamming_decoder.v
          </span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          Extended Hamming (13,8) protects every 8-bit byte by computing 4 Hamming parity bits (p1, p2, p4, p8)
          and 1 overall parity bit (p_all at bit 12). It achieves <strong>SECDED</strong>: Single Error Correction
          and Double Error Detection with a minimum Hamming distance of 4.
        </p>

        {/* SECDED Decision Rules */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs font-mono">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="text-emerald-400 font-semibold">1. Clean / No Error</div>
            <div className="text-slate-400 mt-1">Syndrome = 4'b0000 AND Overall Parity = 0</div>
            <div className="text-slate-500 text-[11px] mt-1">No correction needed; data valid.</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="text-cyan-400 font-semibold">2. Single-Bit Error (Corrected)</div>
            <div className="text-slate-400 mt-1">Overall Parity = 1 (Odd parity)</div>
            <div className="text-slate-500 text-[11px] mt-1">
              Error located at bit index <code className="text-cyan-300">[Syndrome - 1]</code> (or bit 12 if Syndrome == 0). Auto-corrected!
            </div>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="text-rose-400 font-semibold">3. Double-Bit Error (Detected)</div>
            <div className="text-slate-400 mt-1">Syndrome != 0 AND Overall Parity = 0</div>
            <div className="text-slate-500 text-[11px] mt-1">
              SECDED detects 2 bit flips. Parity cancelled out; flags uncorrectable error!
            </div>
          </div>
        </div>
      </div>

      {/* Input Data Byte Controls */}
      <div className="card space-y-4">
        <div className="card-header">
          <div className="card-title text-sm">
            <span>Data Input &amp; Test Vectors</span>
          </div>
          <div className="flex items-center gap-2">
            {[0xa5, 0x3c, 0x00, 0xff, 0x48].map((val) => (
              <button
                key={val}
                onClick={() => {
                  setDataByte(val);
                  setErrorMask(0);
                }}
                className={`px-2.5 py-1 rounded font-mono text-xs border ${
                  dataByte === val
                    ? "border-cyan-400 bg-cyan-950/40 text-cyan-300"
                    : "border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
                }`}
              >
                0x{val.toString(16).padStart(2, "0").toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <label className="text-slate-400 block mb-1">Data In (Hex):</label>
            <input
              type="text"
              value={`0x${dataByte.toString(16).padStart(2, "0").toUpperCase()}`}
              onChange={(e) => {
                const parsed = parseInt(e.target.value.replace(/[^0-9a-fA-F]/g, ""), 16);
                if (!isNaN(parsed)) setDataByte(parsed & 0xff);
              }}
              className="input-field input-mono font-bold text-sm text-cyan-300"
            />
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="text-slate-400 mb-1">Data In (Binary 8 bits):</div>
            <div className="text-white font-bold text-sm tracking-wider">
              {dataByte.toString(2).padStart(8, "0")}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="text-slate-400 mb-1">Encoded 13-bit Codeword:</div>
            <div className="text-emerald-400 font-bold text-sm tracking-wider">
              13'b{cleanCodeword.toString(2).padStart(13, "0")}
            </div>
          </div>
        </div>
      </div>

      {/* Interactive 13-Bit Codeword Error Injection Strip */}
      <div className="card space-y-4">
        <div className="card-header">
          <div className="card-title text-sm">
            <Bug className="w-4 h-4 text-rose-400" />
            <span>Interactive 13-Bit Codeword (Click Any Bit to Flip &amp; Inject Error)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleInjectDoubleError}
              className="btn btn-secondary text-xs py-1 px-2.5"
            >
              Inject Double Error
            </button>
            {errorBitsCount > 0 && (
              <button
                onClick={handleClearErrors}
                className="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset ({errorBitsCount} Error{errorBitsCount > 1 ? "s" : ""})</span>
              </button>
            )}
          </div>
        </div>

        {/* 13-bit chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 lg:grid-cols-13 gap-2 font-mono text-xs">
          {[12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((bitIdx) => {
            const isFlipped = (errorMask >> bitIdx) & 1;
            const originalVal = (cleanCodeword >> bitIdx) & 1;
            const receivedVal = (receivedCodeword >> bitIdx) & 1;
            const isParity = [0, 1, 3, 7, 12].includes(bitIdx);
            const isCorrected = decodeResult.correctedBitIndex === bitIdx;

            let borderStyle = "border-slate-800 bg-slate-950";
            if (isFlipped) borderStyle = "border-rose-500 bg-rose-950/40 text-rose-300 ring-2 ring-rose-500";
            else if (isCorrected) borderStyle = "border-emerald-500 bg-emerald-950/40 text-emerald-300 ring-2 ring-emerald-500";
            else if (isParity) borderStyle = "border-purple-800/60 bg-purple-950/20 text-purple-300";

            return (
              <button
                key={bitIdx}
                onClick={() => toggleBitFlip(bitIdx)}
                className={`p-2.5 rounded-lg border text-center transition-all ${borderStyle}`}
              >
                <div className="text-[10px] text-slate-400">
                  {bitIdx === 12
                    ? "p_all"
                    : isParity
                    ? `p${1 << (bitIdx === 7 ? 3 : bitIdx === 3 ? 2 : bitIdx)}`
                    : `d${[2, 4, 5, 6, 8, 9, 10, 11].indexOf(bitIdx)}`}
                </div>
                <div className="font-bold text-lg my-0.5">
                  {receivedVal}
                </div>
                <div className="text-[10px] text-slate-500">[{bitIdx}]</div>
                {isFlipped && (
                  <div className="text-[9px] text-rose-400 font-bold mt-1">FLIPPED</div>
                )}
                {isCorrected && (
                  <div className="text-[9px] text-emerald-400 font-bold mt-1">FIXED</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Decoder Diagnosis & Truth Table */}
      <div className="card space-y-4">
        <div className="card-header">
          <div className="card-title text-sm">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Decoder Output &amp; Syndrome Evaluation</span>
          </div>
          <span
            className={`badge ${
              decodeResult.noError
                ? "badge-cyan"
                : decodeResult.singleErrorCorrected
                ? "badge-emerald"
                : "badge-rose"
            }`}
          >
            {decodeResult.status.replace(/_/g, " ")}
          </span>
        </div>

        {/* Diagnostics & Calculations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2 font-mono text-xs">
            <div className="text-slate-400 font-semibold">SYNDROME VECTOR EQUATIONS</div>
            <div className="p-2 rounded bg-slate-900/60 border border-slate-800 space-y-1 text-slate-300">
              <div>s0 = c[0]^c[2]^c[4]^c[6]^c[8]^c[10] = <strong className="text-cyan-400">{decodeResult.syndromeBits[0]}</strong></div>
              <div>s1 = c[1]^c[2]^c[5]^c[6]^c[9]^c[10] = <strong className="text-cyan-400">{decodeResult.syndromeBits[1]}</strong></div>
              <div>s2 = c[3]^c[4]^c[5]^c[6]^c[11] = <strong className="text-cyan-400">{decodeResult.syndromeBits[2]}</strong></div>
              <div>s3 = c[7]^c[8]^c[9]^c[10]^c[11] = <strong className="text-cyan-400">{decodeResult.syndromeBits[3]}</strong></div>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span>Computed Syndrome:</span>
              <span className="text-cyan-400 font-bold">
                4'b{decodeResult.syndrome.toString(2).padStart(4, "0")} (dec: {decodeResult.syndrome})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Overall Parity (^codeword):</span>
              <span className="text-purple-400 font-bold">{decodeResult.overallParity}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2 font-mono text-xs">
            <div className="text-slate-400 font-semibold">RECOVERED DATA BYTE</div>
            <div className="p-3 rounded bg-slate-900/60 border border-slate-800 text-center space-y-1">
              <div className="text-xs text-slate-400">data_out[7:0]</div>
              <div className="font-bold text-2xl text-emerald-400">
                0x{decodeResult.dataOut.toString(16).padStart(2, "0").toUpperCase()}
              </div>
              <div className="text-slate-300">
                0b{decodeResult.dataOut.toString(2).padStart(8, "0")}
              </div>
            </div>
            <div className="pt-2 text-slate-300 text-[11px] leading-relaxed">
              {decodeResult.explanation}
            </div>
          </div>
        </div>

        {/* Bit Position Mapping Table */}
        <div className="overflow-x-auto">
          <table className="tech-table">
            <thead>
              <tr>
                <th>Codeword Index</th>
                <th>Hamming Pos (1-based)</th>
                <th>Bit Type</th>
                <th>Designation</th>
                <th>Generator / Parity Equation</th>
                <th>Clean Bit</th>
                <th>Received Bit</th>
              </tr>
            </thead>
            <tbody>
              {codewordDetails.map((b) => {
                const receivedBit = (receivedCodeword >> b.index) & 1;
                const isFlipped = (errorMask >> b.index) & 1;
                return (
                  <tr key={b.index} className={isFlipped ? "bg-rose-950/20" : ""}>
                    <td className="font-mono text-slate-400">c[{b.index}]</td>
                    <td className="font-mono text-cyan-400 font-bold">Pos {b.hammingPos}</td>
                    <td>
                      <span
                        className={`badge ${
                          b.type === "data"
                            ? "badge-cyan"
                            : b.type === "parity"
                            ? "badge-purple"
                            : "badge-amber"
                        }`}
                      >
                        {b.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="font-mono font-bold text-white">{b.parityName}</td>
                    <td className="font-mono text-slate-300 text-xs">{b.equation}</td>
                    <td className="font-mono font-semibold text-slate-300">{b.value}</td>
                    <td
                      className={`font-mono font-bold ${
                        isFlipped ? "text-rose-400" : "text-emerald-400"
                      }`}
                    >
                      {receivedBit} {isFlipped ? "(FLIPPED)" : ""}
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
