import React, { useState, useMemo } from "react";
import {
  Send,
  RotateCcw,
  ShieldCheck,
  Binary,
  Radio,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Bug,
  HelpCircle,
  Clock,
  ArrowRight,
  Info
} from "lucide-react";
import { runPipelineSimulation, InjectedError, PipelineSimulationResult } from "../utils/uartPipeline";

export const MessengerView: React.FC = () => {
  const [inputText, setInputText] = useState<string>("Hello, I am Rishi!");
  const [keyHex, setKeyHex] = useState<string>(
    "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f"
  );
  const [noncePrefixHex, setNoncePrefixHex] = useState<string>("A0A1A2A3A4A5A6A7");
  const [nonceCounter, setNonceCounter] = useState<number>(0);

  // Injected errors list
  const [injectedErrors, setInjectedErrors] = useState<InjectedError[]>([]);

  // Simulation execution result
  const simulationResult = useMemo<PipelineSimulationResult>(() => {
    return runPipelineSimulation(
      inputText,
      keyHex,
      noncePrefixHex,
      nonceCounter,
      injectedErrors
    );
  }, [inputText, keyHex, noncePrefixHex, nonceCounter, injectedErrors]);

  // Selected packet byte for deep inspection
  const [selectedByteIndex, setSelectedByteIndex] = useState<number>(0);
  const selectedStep = simulationResult.steps[selectedByteIndex] || simulationResult.steps[0];

  // Preset messages
  const presets = [
    { label: "Hello (5 bytes)", text: "Hello" },
    { label: "Hello, I am Rishi! (18 bytes)", text: "Hello, I am Rishi!" },
    { label: "CS203 DLD UART (14 bytes)", text: "CS203 DLD UART" },
    {
      label: "70-byte Multi-Block (crosses 64-byte block boundary)",
      text: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz!@#$%^&*()"
    }
  ];

  const handleToggleBitError = (packetByteIndex: number, target: "LOW" | "HIGH", bitIndex: number) => {
    setInjectedErrors((prev) => {
      const exists = prev.some(
        (e) =>
          e.packetByteIndex === packetByteIndex &&
          e.uartByteTarget === target &&
          e.bitIndex === bitIndex
      );
      if (exists) {
        return prev.filter(
          (e) =>
            !(
              e.packetByteIndex === packetByteIndex &&
              e.uartByteTarget === target &&
              e.bitIndex === bitIndex
            )
        );
      } else {
        return [...prev, { packetByteIndex, uartByteTarget: target, bitIndex }];
      }
    });
  };

  const handleClearErrors = () => {
    setInjectedErrors([]);
  };

  return (
    <div className="space-y-6">
      {/* Educational Model Notice Banner */}
      <div className="p-3.5 rounded-lg bg-cyan-950/30 border border-cyan-500/30 flex items-start gap-3 text-xs text-cyan-200">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-cyan-300 font-semibold">Educational Browser Verification: </strong>
          This interactive messenger executes our bit-exact TypeScript model implementing the identical
          algorithms and packet formats defined in <code className="text-cyan-300">rtl/uart_top.v</code>,{" "}
          <code className="text-cyan-300">rtl/chacha20_keystream.v</code>, and{" "}
          <code className="text-cyan-300">rtl/hamming_decoder.v</code>. It lets you inspect intermediate
          cryptographic keystreams, 16-byte protocol headers, SECDED syndrome bits, and UART payload
          bytes without requiring FPGA hardware.
        </div>
      </div>

      {/* Top Message Input & Control Panel */}
      <div className="card space-y-4">
        <div className="card-header">
          <div className="card-title">
            <Send className="w-5 h-5 text-cyan-400" />
            <span>Sender Host Station (Transmitter)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Presets:</span>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInputText(p.text);
                    setSelectedByteIndex(0);
                  }}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] font-mono text-slate-300 transition-colors"
                >
                  {p.label.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Plaintext Input */}
          <div className="lg:col-span-2 space-y-2">
            <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
              <span>Host Plaintext Input Message:</span>
              <span className="font-mono text-slate-400">
                Length: {inputText.length} bytes
              </span>
            </label>
            <textarea
              rows={3}
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                setSelectedByteIndex(0);
              }}
              placeholder="Type message to transmit..."
              className="input-field font-mono text-sm resize-none"
            />
          </div>

          {/* Cryptographic Key & Nonce Controls */}
          <div className="space-y-2 text-xs">
            <label className="font-semibold text-slate-300">
              ChaCha20 256-bit Symmetric Key (Hex):
            </label>
            <input
              type="text"
              value={keyHex}
              onChange={(e) => setKeyHex(e.target.value)}
              className="input-field input-mono text-[11px]"
            />
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="text-[11px] text-slate-400">Nonce Prefix (64-bit):</label>
                <input
                  type="text"
                  value={noncePrefixHex}
                  onChange={(e) => setNoncePrefixHex(e.target.value)}
                  className="input-field input-mono text-[11px]"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400">Nonce Counter (32-bit):</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={nonceCounter}
                    onChange={(e) => setNonceCounter(parseInt(e.target.value) || 0)}
                    className="input-field input-mono text-[11px]"
                  />
                  <button
                    onClick={() => setNonceCounter((c) => c + 1)}
                    className="btn btn-secondary text-xs px-2 py-1.5"
                    title="Increment counter"
                  >
                    +1
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Receiver Comparison & Status Alert */}
      <div className="card space-y-4">
        <div className="card-header">
          <div className="card-title">
            <CheckCircle2
              className={`w-5 h-5 ${
                simulationResult.isPerfectMatch ? "text-emerald-400" : "text-rose-400"
              }`}
            />
            <span>Receiver Station & Integrity Check</span>
          </div>
          <div className="flex items-center gap-2">
            {simulationResult.isPerfectMatch ? (
              <span className="badge badge-emerald flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 100% Match Verified
              </span>
            ) : (
              <span className="badge badge-rose flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Recovered Data Mismatch
              </span>
            )}
            {injectedErrors.length > 0 && (
              <button
                onClick={handleClearErrors}
                className="btn btn-secondary text-xs py-1 px-2.5 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Clear {injectedErrors.length} Bit Errors</span>
              </button>
            )}
          </div>
        </div>

        {/* Side-by-side comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>TRANSMITTED PLAINTEXT</span>
              <span>{inputText.length} bytes</span>
            </div>
            <div className="font-mono text-sm text-cyan-300 break-all p-2 rounded bg-slate-900/60 border border-slate-800">
              {inputText || <span className="text-slate-600">(empty)</span>}
            </div>
          </div>

          <div
            className={`p-3.5 rounded-lg border space-y-1.5 ${
              simulationResult.isPerfectMatch
                ? "bg-slate-950 border-emerald-500/30"
                : "bg-rose-950/20 border-rose-500/40"
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>RECOVERED PLAINTEXT</span>
              <span>{simulationResult.recoveredPlaintext.length} bytes</span>
            </div>
            <div
              className={`font-mono text-sm break-all p-2 rounded border ${
                simulationResult.isPerfectMatch
                  ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-300"
                  : "bg-rose-950/30 border-rose-500/30 text-rose-300"
              }`}
            >
              {simulationResult.recoveredPlaintext || (
                <span className="text-slate-600">(no payload received)</span>
              )}
            </div>
          </div>
        </div>

        {/* Receiver diagnostics pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
            <div className="text-slate-400 text-[11px]">Sync Bytes Match</div>
            <div className="text-emerald-400 font-semibold mt-0.5">
              {simulationResult.syncFound ? "0xC3 0x5A Valid" : "Sync Failed"}
            </div>
          </div>
          <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
            <div className="text-slate-400 text-[11px]">Single Errors Corrected</div>
            <div className="text-cyan-400 font-semibold mt-0.5">
              {simulationResult.receiverSingleErrorsCorrected} Corrected
            </div>
          </div>
          <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
            <div className="text-slate-400 text-[11px]">Double Errors Detected</div>
            <div
              className={`font-semibold mt-0.5 ${
                simulationResult.receiverDoubleErrorsDetected > 0
                  ? "text-rose-400"
                  : "text-slate-300"
              }`}
            >
              {simulationResult.receiverDoubleErrorsDetected} Detected
            </div>
          </div>
          <div className="p-2.5 rounded bg-slate-950 border border-slate-800">
            <div className="text-slate-400 text-[11px]">Total UART Payload Bytes</div>
            <div className="text-amber-400 font-semibold mt-0.5">
              {simulationResult.totalUartBytes} Bytes ({simulationResult.totalUartBytes * 10} Bits)
            </div>
          </div>
        </div>
      </div>

      {/* Packet Stream Byte Inspector & Error Injection Grid */}
      <div className="card space-y-4">
        <div className="card-header">
          <div className="card-title">
            <Binary className="w-5 h-5 text-cyan-400" />
            <span>Packet Stream Inspector & Channel Error Injection</span>
          </div>
          <span className="text-xs text-slate-400">
            Click any byte below to inspect its ChaCha20 keystream, Hamming codeword, and inject noise
          </span>
        </div>

        {/* Byte Stream Tape */}
        <div className="flex gap-2 overflow-x-auto pb-3 pt-1">
          {simulationResult.steps.map((step, idx) => {
            const isSelected = selectedByteIndex === idx;
            const hasError = step.errorInjectedLow || step.errorInjectedHigh;
            const isCorrected = step.decodeResult.singleErrorCorrected;
            const isDouble = step.decodeResult.doubleErrorDetected;

            let badgeColor = "border-slate-800 bg-slate-950 text-slate-300";
            if (hasError) badgeColor = "border-rose-500 bg-rose-950/40 text-rose-300";
            else if (isCorrected) badgeColor = "border-emerald-500 bg-emerald-950/40 text-emerald-300";
            else if (step.stage === "HEADER") badgeColor = "border-purple-800/60 bg-purple-950/30 text-purple-300";

            return (
              <button
                key={idx}
                onClick={() => setSelectedByteIndex(idx)}
                className={`shrink-0 p-2.5 rounded-lg border font-mono text-xs flex flex-col items-center gap-1 transition-all ${
                  isSelected
                    ? "ring-2 ring-cyan-400 border-cyan-400 bg-cyan-950/40"
                    : badgeColor
                }`}
              >
                <span className="text-[10px] text-slate-400 font-sans">
                  {step.stage === "HEADER" ? `H${idx}` : `P${idx - 16}`}
                </span>
                <span className="font-bold text-sm text-white">
                  0x{step.rawByte.toString(16).padStart(2, "0").toUpperCase()}
                </span>
                <span className="text-[10px] text-slate-400">
                  {step.isPlaintext ? `'${step.plaintextChar}'` : step.byteName.split(" ")[0]}
                </span>
                {hasError && <span className="text-[9px] text-rose-400 font-bold">ERROR</span>}
                {isCorrected && <span className="text-[9px] text-emerald-400 font-bold">FIXED</span>}
                {isDouble && <span className="text-[9px] text-rose-400 font-bold">SECDED</span>}
              </button>
            );
          })}
        </div>

        {/* Detailed Single-Byte Stage-by-Stage Transformation Card */}
        {selectedStep && (
          <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-900 pb-3">
              <div className="flex items-center gap-3">
                <span className="badge badge-cyan font-mono text-xs">
                  Packet Byte #{selectedStep.byteIndexInPacket}
                </span>
                <span className="text-sm font-semibold text-white">
                  {selectedStep.byteName}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  Stage: {selectedStep.stage}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Value:</span>
                <span className="font-mono text-sm text-cyan-400 font-bold">
                  0x{selectedStep.rawByte.toString(16).padStart(2, "0").toUpperCase()}
                </span>
                <span className="font-mono text-xs text-slate-400">
                  (0b{selectedStep.rawByte.toString(2).padStart(8, "0")})
                </span>
              </div>
            </div>

            {/* Cryptographic breakdown if Payload */}
            {selectedStep.isPlaintext && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-xs font-mono">
                <div>
                  <div className="text-slate-400 text-[11px]">Plaintext Byte</div>
                  <div className="text-cyan-300 font-semibold mt-0.5">
                    '{selectedStep.plaintextChar}' (0x
                    {selectedStep.plaintextChar?.charCodeAt(0).toString(16).padStart(2, "0").toUpperCase()})
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">ChaCha20 Keystream Byte</div>
                  <div className="text-purple-300 font-semibold mt-0.5">
                    0x{selectedStep.keystreamByte?.toString(16).padStart(2, "0").toUpperCase()}
                  </div>
                </div>
                <div>
                  <div className="text-slate-400 text-[11px]">Ciphertext (Plaintext ^ Key)</div>
                  <div className="text-emerald-300 font-semibold mt-0.5">
                    0x{selectedStep.ciphertextByte?.toString(16).padStart(2, "0").toUpperCase()}
                  </div>
                </div>
              </div>
            )}

            {/* Hamming 13-bit Codeword Encoding */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200">
                  Hamming (13,8) Encoded Codeword:
                </span>
                <span className="font-mono text-cyan-400">
                  13'b{selectedStep.codewordEncoded.toString(2).padStart(13, "0")} (0x
                  {selectedStep.codewordEncoded.toString(16).toUpperCase()})
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 font-mono text-xs">
                {[12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((bitIdx) => {
                  const bitVal = (selectedStep.codewordEncoded >> bitIdx) & 1;
                  const isParity = [0, 1, 3, 7, 12].includes(bitIdx);
                  return (
                    <div
                      key={bitIdx}
                      className={`p-1.5 rounded flex flex-col items-center min-w-[2.2rem] border ${
                        isParity
                          ? "bg-purple-950/30 border-purple-800/40 text-purple-300"
                          : "bg-slate-900 border-slate-800 text-slate-200"
                      }`}
                    >
                      <span className="text-[10px] text-slate-400">
                        {bitIdx === 12
                          ? "p_all"
                          : isParity
                          ? `p${1 << (bitIdx === 7 ? 3 : bitIdx === 3 ? 2 : bitIdx)}`
                          : `d`}
                      </span>
                      <span className="font-bold text-sm">{bitVal}</span>
                      <span className="text-[9px] text-slate-500">[{bitIdx}]</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dual UART Payload Bytes & Error Injection Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-900">
              {/* Byte 0 (LOW) */}
              <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300 font-semibold">
                    UART Byte 0 (LOW: c[7:0])
                  </span>
                  <span className="text-cyan-400 font-bold">
                    0x{selectedStep.uartByteLowReceived.toString(16).padStart(2, "0").toUpperCase()}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Click any bit below to inject / flip a transmission error:
                </div>
                <div className="flex gap-1 font-mono text-xs">
                  {[7, 6, 5, 4, 3, 2, 1, 0].map((bitIdx) => {
                    const isError = injectedErrors.some(
                      (e) =>
                        e.packetByteIndex === selectedStep.byteIndexInPacket &&
                        e.uartByteTarget === "LOW" &&
                        e.bitIndex === bitIdx
                    );
                    const bitVal = (selectedStep.uartByteLowReceived >> bitIdx) & 1;
                    return (
                      <button
                        key={bitIdx}
                        onClick={() =>
                          handleToggleBitError(selectedStep.byteIndexInPacket, "LOW", bitIdx)
                        }
                        className={`flex-1 py-1.5 rounded flex flex-col items-center border transition-all ${
                          isError
                            ? "bg-rose-500/20 border-rose-500 text-rose-300 ring-1 ring-rose-500"
                            : "bg-slate-950 border-slate-800 hover:border-slate-600 text-slate-300"
                        }`}
                      >
                        <span className="font-bold">{bitVal}</span>
                        <span className="text-[9px] text-slate-500">b{bitIdx}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Byte 1 (HIGH) */}
              <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300 font-semibold">
                    UART Byte 1 (HIGH: 3'b000, c[12:8])
                  </span>
                  <span className="text-cyan-400 font-bold">
                    0x{selectedStep.uartByteHighReceived.toString(16).padStart(2, "0").toUpperCase()}
                  </span>
                </div>
                <div className="text-[11px] text-slate-400">
                  Bits 7–5 are 3-bit zero padding. Bits 4–0 are codeword bits [12:8]:
                </div>
                <div className="flex gap-1 font-mono text-xs">
                  {[7, 6, 5, 4, 3, 2, 1, 0].map((bitIdx) => {
                    const isPadding = bitIdx >= 5;
                    const isError = injectedErrors.some(
                      (e) =>
                        e.packetByteIndex === selectedStep.byteIndexInPacket &&
                        e.uartByteTarget === "HIGH" &&
                        e.bitIndex === bitIdx
                    );
                    const bitVal = (selectedStep.uartByteHighReceived >> bitIdx) & 1;
                    return (
                      <button
                        key={bitIdx}
                        onClick={() =>
                          handleToggleBitError(selectedStep.byteIndexInPacket, "HIGH", bitIdx)
                        }
                        className={`flex-1 py-1.5 rounded flex flex-col items-center border transition-all ${
                          isError
                            ? "bg-rose-500/20 border-rose-500 text-rose-300 ring-1 ring-rose-500"
                            : isPadding
                            ? "bg-slate-950/60 border-slate-800 text-slate-500"
                            : "bg-slate-950 border-slate-800 hover:border-slate-600 text-slate-300"
                        }`}
                      >
                        <span className="font-bold">{bitVal}</span>
                        <span className="text-[9px] text-slate-500">
                          {isPadding ? `pad` : `b${bitIdx}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Receiver Hamming Decoder Result */}
            <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-200">
                    Receiver Decoder Output:
                  </span>
                  {selectedStep.decodeResult.singleErrorCorrected && (
                    <span className="badge badge-emerald">Single-Bit Error Auto-Corrected</span>
                  )}
                  {selectedStep.decodeResult.doubleErrorDetected && (
                    <span className="badge badge-rose">Double-Bit Error Detected (SECDED)</span>
                  )}
                  {selectedStep.decodeResult.noError && (
                    <span className="badge badge-cyan">Clean Codeword (No Errors)</span>
                  )}
                  {selectedStep.formatError && (
                    <span className="badge badge-amber">Format Error (Padding != 000)</span>
                  )}
                </div>
                <div className="font-mono text-slate-400">
                  Syndrome: 4'b{selectedStep.decodeResult.syndrome.toString(2).padStart(4, "0")} |
                  Overall Parity: {selectedStep.decodeResult.overallParity}
                </div>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-mono">
                {selectedStep.decodeResult.explanation}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Activity Timeline Log */}
      <div className="card space-y-3">
        <div className="card-header">
          <div className="card-title text-sm">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>Cycle-Accurate Hardware Activity Log</span>
          </div>
          <span className="badge badge-cyan text-[10px] font-mono">
            {simulationResult.steps.length * 2} UART Transactions
          </span>
        </div>

        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 max-h-48 overflow-y-auto font-mono text-xs space-y-1.5 text-slate-300">
          <div className="text-cyan-400">
            [T+0] TX_MESSAGE_START asserted | Length = {simulationResult.messageLength} bytes
          </div>
          <div className="text-slate-400">
            [T+1] State &lt;= TX_HEADER | Nonce = 0x{simulationResult.fullNonceHex}
          </div>
          <div className="text-slate-400">
            [T+16] 16-byte protocol header generated &amp; pushed into Hamming Encoder
          </div>
          <div className="text-purple-400">
            [T+17] ChaCha20 core started with counter = 1 | Keystream block generated
          </div>
          <div className="text-slate-400">
            [T+32] State &lt;= TX_PAYLOAD | Stream encryption active
          </div>
          <div className="text-emerald-400">
            [T+{simulationResult.totalUartBytes * 10}] UART TX serial line transmission completed
          </div>
          {simulationResult.receiverSingleErrorsCorrected > 0 && (
            <div className="text-amber-400">
              [RX_SECDED] Corrected {simulationResult.receiverSingleErrorsCorrected} single-bit channel faults
            </div>
          )}
          {simulationResult.receiverDoubleErrorsDetected > 0 && (
            <div className="text-rose-400">
              [RX_SECDED] Double-bit error detected on channel! rx_packet_error asserted
            </div>
          )}
          <div className="text-emerald-400 font-semibold">
            [RX_DONE] Decryption completed. Recovered plaintext stream released to host.
          </div>
        </div>
      </div>
    </div>
  );
};
