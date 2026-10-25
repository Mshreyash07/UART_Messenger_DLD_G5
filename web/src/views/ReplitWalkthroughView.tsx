import React, { useState, useMemo } from "react";
import {
  Send,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileCode2,
  Lock,
  ArrowRight,
  ShieldCheck,
  Eye,
  Terminal,
  Activity,
  Layers,
  Check,
  Copy
} from "lucide-react";
import {
  runPipelineSimulation,
  InjectedError,
  PipelineSimulationResult
} from "../utils/uartPipeline";
import { RTL_MODULES, TESTBENCHES, RTLModule } from "../data/sourceData";
import { NavTab } from "../components/Navbar";

interface ReplitWalkthroughViewProps {
  onNavigateTab: (tab: NavTab, targetModule?: string) => void;
}

export const ReplitWalkthroughView: React.FC<ReplitWalkthroughViewProps> = ({ onNavigateTab }) => {
  // Input message state
  const [message, setMessage] = useState<string>("Meet me at the lab at 09:30.");
  const [errorMode, setErrorMode] = useState<"none" | "single" | "double">("single");
  const [corruptByteIdx, setCorruptByteIdx] = useState<number>(0);
  const [corruptBit1, setCorruptBit1] = useState<number>(5);
  const [corruptBit2, setCorruptBit2] = useState<number>(6);

  // Active pipeline stage tab
  const [activeStage, setActiveStage] = useState<string>("plaintext");

  // Selected byte to inspect in results
  const [inspectedByteIdx, setInspectedByteIdx] = useState<number>(0);

  // Selected module for RTL inspector
  const [selectedModuleId, setSelectedModuleId] = useState<string>("uart_top.v");
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Build errors array based on controls
  const injectedErrors = useMemo<InjectedError[]>(() => {
    if (errorMode === "none") return [];
    // Corrupt byte index in packet (payload starts at index 16)
    const targetPacketIdx = 16 + corruptByteIdx;
    const errors: InjectedError[] = [];

    // Map bit 0..12 to Low byte (bits 0..7) or High byte (bits 8..12 -> bits 0..4)
    const mapCodewordBitToUart = (codewordBit: number): { target: "LOW" | "HIGH"; bit: number } => {
      if (codewordBit < 8) {
        return { target: "LOW", bit: codewordBit };
      } else {
        return { target: "HIGH", bit: codewordBit - 8 };
      }
    };

    const b1 = mapCodewordBitToUart(corruptBit1);
    errors.push({
      packetByteIndex: targetPacketIdx,
      uartByteTarget: b1.target,
      bitIndex: b1.bit
    });

    if (errorMode === "double") {
      const b2 = mapCodewordBitToUart(corruptBit2);
      errors.push({
        packetByteIndex: targetPacketIdx,
        uartByteTarget: b2.target,
        bitIndex: b2.bit
      });
    }

    return errors;
  }, [errorMode, corruptByteIdx, corruptBit1, corruptBit2]);

  // Execute pipeline
  const sim = useMemo<PipelineSimulationResult>(() => {
    return runPipelineSimulation(
      message,
      "000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f",
      "A0A1A2A3A4A5A6A7",
      0,
      injectedErrors
    );
  }, [message, injectedErrors]);

  // Selected step for detail card
  const selectedStep = sim.steps[16 + inspectedByteIdx] || sim.steps[16] || sim.steps[0];

  const pipelineStages = [
    {
      id: "plaintext",
      num: "01",
      name: "Plaintext",
      caption: "UTF-8 message",
      note: "Host bytes are sampled synchronously with tx_data_valid / tx_data_ready flow control handshakes."
    },
    {
      id: "encrypt",
      num: "02",
      name: "ChaCha20",
      caption: "XOR keystream",
      note: "The 256-bit symmetric key and 96-bit nonce generate 64-byte keystream blocks. Bitwise XOR encrypts on the fly."
    },
    {
      id: "encode",
      num: "03",
      name: "Hamming (13,8)",
      caption: "SECDED encoder",
      note: "Each byte is protected with 4 parity bits (p1, p2, p4, p8) and 1 overall parity bit (p_all at bit 12), achieving d_min = 4."
    },
    {
      id: "transmit",
      num: "04",
      name: "UART channel",
      caption: "13-bit codewords",
      note: "Each 13-bit codeword is packed into two 8-bit UART bytes and serialized at 9600 baud with 8N1 framing."
    },
    {
      id: "decode",
      num: "05",
      name: "Recover",
      caption: "Correct + decrypt",
      note: "Hamming syndrome calculation fixes single-bit wire faults, detects double errors, and ChaCha20 decrypts the payload."
    }
  ];

  const activeStageObj = pipelineStages.find((s) => s.id === activeStage) || pipelineStages[0];

  const selectedModule: RTLModule =
    RTL_MODULES.find((m) => m.file === selectedModuleId) || RTL_MODULES[0];

  const moduleWalkthroughs: Record<string, string[]> = {
    "uart_top.v": [
      "Acts as the single integrated top-level module connecting all sub-blocks.",
      "Handles 16-byte protocol framing: 0xC3, 0x5A sync bytes, 12-byte nonce, and 2-byte length.",
      "Coordinates ChaCha20 stream encryption, FIFO buffering, and UART transmission handshaking."
    ],
    "chacha20_keystream.v": [
      "Executes the RFC 7539 / 8439 20-round permutation with 10 column rounds and 10 diagonal rounds.",
      "Initializes 4 constant words ('expand 32-byte k'), 8 key words, 1 counter word, and 3 nonce words.",
      "Automatically increments counter and generates a fresh 64-byte keystream block when 64 bytes are consumed."
    ],
    "hamming_encoder.v": [
      "Purely combinational module mapping 8 data bits into 13 codeword positions.",
      "Calculates parity bits p1, p2, p4, p8 covering overlapping power-of-two index subsets.",
      "Computes bit 12 as the overall parity (XOR reduction of bits 0..11) to elevate the code to SECDED."
    ],
    "hamming_decoder.v": [
      "Calculates 4-bit syndrome vector [s3, s2, s1, s0] and overall parity across all 13 bits.",
      "Corrects any single-bit transmission error at bit position (syndrome - 1) or bit 12.",
      "Asserts double_error_detected if syndrome is non-zero but overall parity is even."
    ],
    "uart_tx.v": [
      "Standard 8N1 serial transmitter: Start bit (0), 8 data bits LSB-first, Stop bit (1).",
      "Paced by 1-clock-cycle pulses from baud_gen.",
      "Maintains tx_busy and tx_done status flags."
    ],
    "uart_rx.v": [
      "Oversamples incoming serial line with 2-stage synchronizer to avoid metastability.",
      "Aligns to start bit falling edge, then samples each bit at the exact mid-bit center (CLKS_PER_BIT / 2).",
      "Validates stop bit HIGH (1) before asserting rx_done strobe."
    ]
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(selectedModule.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Hero Row */}
      <div className="hero-row">
        <div>
          <div className="eyebrow">
            UART security bench <span style={{ color: "#b0aa9e" }}>· 01 / walkthrough</span>
          </div>
          <h1 className="hero-title">
            CS203 Project Group 5
            <br />
            <span style={{ color: "#277261" }}>UART Messenger Simulator</span>
          </h1>
          <p className="hero-copy">
            Send a message through our secure UART pipeline. Follow encryption,
            error-correction coding, a noisy wire, and recovery—one byte at a time.
          </p>
        </div>
        <div className="bench-tag">
          <Terminal size={12} style={{ display: "inline", verticalAlign: "-2px", marginRight: 8 }} />
          LOCAL SOFTWARE MODEL · NOT CYCLE-ACCURATE
        </div>
      </div>

      {/* Send Message Panel */}
      <form
        className="panel send-panel"
        onSubmit={(e) => {
          e.preventDefault();
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <label className="field-label" htmlFor="message" style={{ margin: 0 }}>
            Message to transmit <span style={{ color: "#afb4aa" }}>· UTF-8</span>
          </label>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500">Presets:</span>
            {["Meet me at the lab at 09:30.", "Hello", "Hello, I am Rishi!"].map((p, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setMessage(p);
                  setInspectedByteIdx(0);
                }}
                className="btn-quiet py-0.5 px-2 text-[10px]"
              >
                {p.split(" ")[0]}
              </button>
            ))}
          </div>
        </div>

        <textarea
          id="message"
          className="message-input"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            setInspectedByteIdx(0);
          }}
          maxLength={220}
          placeholder="Type a short message..."
        />

        <div className="send-controls">
          <div className="error-controls">
            <label className="error-control" htmlFor="error-mode">
              <span>Channel noise</span>
              <select
                id="error-mode"
                className="select-input"
                value={errorMode}
                onChange={(e) => setErrorMode(e.target.value as any)}
              >
                <option value="none">No error</option>
                <option value="single">Single-bit error</option>
                <option value="double">Two-bit error</option>
              </select>
            </label>

            {errorMode !== "none" && (
              <>
                <label className="error-control">
                  <span>Byte #</span>
                  <select
                    className="select-input"
                    style={{ width: "95px" }}
                    value={corruptByteIdx}
                    onChange={(e) => setCorruptByteIdx(parseInt(e.target.value))}
                  >
                    {Array.from({ length: Math.min(message.length, 30) }).map((_, i) => (
                      <option key={i} value={i}>
                        Byte {i} ('{message[i]}')
                      </option>
                    ))}
                  </select>
                </label>

                <label className="error-control">
                  <span>Flip bit 1</span>
                  <select
                    className="select-input"
                    style={{ width: "85px" }}
                    value={corruptBit1}
                    onChange={(e) => setCorruptBit1(parseInt(e.target.value))}
                  >
                    {Array.from({ length: 13 }).map((_, i) => (
                      <option key={i} value={i}>
                        Bit {i}
                      </option>
                    ))}
                  </select>
                </label>

                {errorMode === "double" && (
                  <label className="error-control">
                    <span>Flip bit 2</span>
                    <select
                      className="select-input"
                      style={{ width: "85px" }}
                      value={corruptBit2}
                      onChange={(e) => setCorruptBit2(parseInt(e.target.value))}
                    >
                      {Array.from({ length: 13 }).map((_, i) => (
                        <option key={i} value={i}>
                          Bit {i}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
              </>
            )}
          </div>

          <button type="submit" className="btn-primary">
            <span>Transmit message</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </form>

      {/* 5-Stage Visual Pipeline Track */}
      <section className="panel pipeline">
        <div className="panel-head">
          <h2 className="panel-title">Transmission pipeline</h2>
          <span className="panel-kicker">5 operational stages</span>
        </div>

        <div className="pipeline-track">
          {pipelineStages.map((stage) => {
            const isActive = activeStage === stage.id;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setActiveStage(stage.id)}
                className={`stage-card ${isActive ? "active" : ""}`}
              >
                <div className="stage-number">{stage.num}</div>
                <span className="stage-name">{stage.name}</span>
                <span className="stage-caption">{stage.caption}</span>
              </button>
            );
          })}
        </div>

        <div className="pipeline-note">
          <strong style={{ color: "#277261" }}>Stage {activeStageObj.num} / {activeStageObj.name}: </strong>
          {activeStageObj.note}
        </div>
      </section>

      {/* Results Grid: Transmission Results & Passive Wire Interceptor */}
      <div className="results-grid">
        {/* Left Card: Transmitted & Recovered Comparison */}
        <article className="panel result-card">
          <div className="panel-head">
            <h2 className="panel-title">Transmission &amp; recovery</h2>
            <span className="panel-kicker">
              {sim.isPerfectMatch ? (
                <span style={{ color: "#1d7464", fontWeight: 800 }}>✓ Verified Match</span>
              ) : (
                <span style={{ color: "#9b3428", fontWeight: 800 }}>⚠ Corrupted</span>
              )}
            </span>
          </div>

          <div className="result-content">
            <div className="result-row">
              <div className="result-label">
                <span>Original plaintext</span>
                <span>{message.length} bytes</span>
              </div>
              <div className="value-box font-mono">{message}</div>
            </div>

            <div className="result-row">
              <div className="result-label">
                <span>Recovered plaintext</span>
                <span>{sim.recoveredPlaintext.length} bytes</span>
              </div>
              <div
                className="value-box font-mono"
                style={{
                  background: sim.isPerfectMatch ? "#edf5f0" : "#faebe8",
                  borderColor: sim.isPerfectMatch ? "#cde3d6" : "#f0cac3",
                  color: sim.isPerfectMatch ? "#1b5e50" : "#8b2c21"
                }}
              >
                {sim.recoveredPlaintext}
              </div>

              {sim.receiverSingleErrorsCorrected > 0 && (
                <div className="error-status">
                  ✓ Single-bit error detected on channel and corrected by Extended Hamming (13,8) SECDED decoder.
                </div>
              )}
              {sim.receiverDoubleErrorsDetected > 0 && (
                <div className="error-status error-status-bad">
                  ⚠ Double-bit error detected on channel! Parity parity is even; SECDED detected the fault.
                </div>
              )}
            </div>

            {/* Interactive Byte Selector & Codeword Detail */}
            <div className="result-row" style={{ marginTop: 24, paddingTop: 18, borderTop: "1px solid #e7e3d9" }}>
              <div className="result-label">
                <span>Inspect byte in transmission</span>
                <span style={{ color: "#277261" }}>
                  Byte {inspectedByteIdx} of {message.length - 1}
                </span>
              </div>

              {/* Byte selector pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-2">
                {Array.from({ length: Math.min(message.length, 25) }).map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setInspectedByteIdx(i)}
                    className={`btn-quiet py-1 px-2 text-[10px] font-mono ${
                      inspectedByteIdx === i ? "bg-[#1d7464] text-white border-[#1d7464]" : ""
                    }`}
                  >
                    '{message[i]}'
                  </button>
                ))}
              </div>

              {selectedStep && (
                <div className="p-3 rounded bg-[#f4f2ea] border border-[#e2ded2] text-xs font-mono space-y-2 mt-3">
                  <div className="flex justify-between text-slate-500 text-[10px]">
                    <span>DATA BYTE: 0x{selectedStep.rawByte.toString(16).padStart(2, "0").toUpperCase()} ('{selectedStep.plaintextChar}')</span>
                    <span>KEYSTREAM: 0x{selectedStep.keystreamByte?.toString(16).padStart(2, "0").toUpperCase()}</span>
                    <span>CIPHERTEXT: 0x{selectedStep.ciphertextByte?.toString(16).padStart(2, "0").toUpperCase()}</span>
                  </div>

                  <div>
                    <div className="text-[10px] text-slate-500 uppercase mb-1">
                      13-Bit Codeword on wire (bits 12 to 0):
                    </div>
                    <div className="bit-strip">
                      {[12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((bitIdx) => {
                        const bitVal = (selectedStep.depacketizedCodeword >> bitIdx) & 1;
                        const isFlipped =
                          errorMode !== "none" &&
                          inspectedByteIdx === corruptByteIdx &&
                          (bitIdx === corruptBit1 || (errorMode === "double" && bitIdx === corruptBit2));
                        const isCorrected = selectedStep.decodeResult.correctedBitIndex === bitIdx;

                        return (
                          <div
                            key={bitIdx}
                            className={`bit-cell ${
                              isFlipped ? "flip" : isCorrected ? "corrected" : ""
                            }`}
                            title={`Bit [${bitIdx}] = ${bitVal}`}
                          >
                            {bitVal}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-600 flex justify-between pt-1 border-t border-[#e5e1d5]">
                    <span>Syndrome: 4'b{selectedStep.decodeResult.syndrome.toString(2).padStart(4, "0")}</span>
                    <span>Overall Parity: {selectedStep.decodeResult.overallParity}</span>
                    <span style={{ color: selectedStep.decodeResult.doubleErrorDetected ? "#9b3428" : "#1d7464" }}>
                      {selectedStep.decodeResult.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </article>

        {/* Right Card: Passive Wire Observer (Interceptor) */}
        <article className="panel result-card interceptor-card">
          <div className="panel-head">
            <h2 className="panel-title flex items-center gap-2">
              <Eye size={14} color="#5adbb5" />
              <span>Passive wire observer</span>
            </h2>
            <span className="panel-kicker">Wire intercept</span>
          </div>

          <div className="result-content">
            <div className="result-row">
              <div className="result-label">
                <span>Encrypted payload (Hex)</span>
                <span>{sim.ciphertextBytes.length} bytes</span>
              </div>
              <div className="value-box font-mono" style={{ maxHeight: 110 }}>
                {Array.from(sim.ciphertextBytes)
                  .map((b) => b.toString(16).padStart(2, "0").toUpperCase())
                  .join(" ")}
              </div>
            </div>

            <div className="result-row">
              <div className="result-label">
                <span>Hamming UART frames</span>
                <span>{sim.totalUartBytes} UART bytes</span>
              </div>
              <div className="value-box font-mono" style={{ maxHeight: 110 }}>
                {sim.steps
                  .slice(16)
                  .map(
                    (s) =>
                      `[${s.uartByteLowReceived.toString(16).padStart(2, "0")}, ${s.uartByteHighReceived.toString(16).padStart(2, "0")}]`
                  )
                  .join(" ")}
              </div>
            </div>

            <div className="privacy-note">
              An eavesdropper tapping the UART line observes only pseudorandom ciphertext bytes
              and Hamming codewords. Without the 256-bit ChaCha20 secret key, plaintext cannot be recovered.
            </div>
          </div>
        </article>
      </div>

      {/* Security Alert Banner */}
      <div className="security-alert" role="note">
        <span className="alert-mark">!</span>
        <span>
          <strong>Protocol boundary:</strong> The uploaded top module (<code>rtl/uart_top.v</code>)
          prepends a 16-byte protocol header (Sync <code>0xC3, 0x5A</code>, 12-byte Nonce, 2-byte Length)
          in the clear before the ciphertext payload. Hamming (13,8) coding provides forward error
          correction over the wire, not cryptographic integrity or secrecy.
        </span>
      </div>

      {/* RTL Source Explorer Section */}
      <section>
        <div className="section-heading">
          <div>
            <div className="eyebrow">Project internals · Verilog source</div>
            <h2>Inspect the actual modules.</h2>
          </div>
          <p>
            Module explanations and source code are bundled directly from the repository.
            Select any module to inspect its exact hardware implementation.
          </p>
        </div>

        <div className="explorer-grid">
          {/* Module List Sidebar */}
          <aside className="panel module-list">
            <div className="module-list-head">
              <span className="panel-kicker">Uploaded modules</span>
              <span className="panel-kicker">{RTL_MODULES.length} files</span>
            </div>

            <div>
              {RTL_MODULES.map((mod) => {
                const isSelected = selectedModuleId === mod.file;
                return (
                  <button
                    key={mod.file}
                    type="button"
                    onClick={() => setSelectedModuleId(mod.file)}
                    className={`module-row ${isSelected ? "selected" : ""}`}
                  >
                    <span className="module-file">{mod.file}</span>
                    <span className="module-title">{mod.title}</span>
                    <span className="module-stage">{mod.category}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Module Source Card */}
          <article className="panel source-card">
            <div className="panel-head">
              <div className="source-meta">
                <FileCode2 size={16} color="#1d7464" />
                <h3 className="panel-title">{selectedModule.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="file-pill">{selectedModule.file}</span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="btn-quiet py-1 px-2 text-[10px] flex items-center gap-1"
                >
                  {copiedCode ? <Check size={11} /> : <Copy size={11} />}
                  <span>{copiedCode ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>

            <div className="source-description">{selectedModule.summary}</div>

            {/* Code Block */}
            <div className="code-wrap">
              {selectedModule.code.split("\n").map((line, idx) => (
                <div key={idx} className="code-line">
                  <span className="line-num">{idx + 1}</span>
                  <span className="code-text">{line || " "}</span>
                </div>
              ))}
            </div>

            {/* Walkthrough Explanation */}
            <div className="module-walkthrough">
              <h4>How this file works</h4>
              <ol>
                {(moduleWalkthroughs[selectedModule.file] || [selectedModule.summary]).map(
                  (pt, idx) => (
                    <li key={idx}>{pt}</li>
                  )
                )}
              </ol>
              <p>
                These notes explain the uploaded RTL at a functional level. The live message simulation
                above is a browser-side teaching model, not a cycle-accurate execution of this Verilog.
              </p>
            </div>
          </article>
        </div>
      </section>

      {/* Testbench Verification Summary Card */}
      <section className="panel" style={{ marginTop: 28 }}>
        <div className="panel-head">
          <h2 className="panel-title flex items-center gap-2">
            <Activity size={15} color="#1d7464" />
            <span>Testbench verification results (9/9 passing)</span>
          </h2>
          <button
            type="button"
            onClick={() => onNavigateTab("tb")}
            className="btn-quiet text-[11px]"
          >
            Open full testbench explorer →
          </button>
        </div>

        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          {TESTBENCHES.slice(0, 6).map((tb) => (
            <div key={tb.file} className="p-2.5 rounded bg-[#f4f2ea] border border-[#e2ded2]">
              <div className="flex justify-between">
                <span className="font-bold text-slate-800">{tb.file}</span>
                <span className="text-[#1d7464] font-bold">✓ PASS</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-1 truncate">{tb.scope}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer Note */}
      <footer className="footer-note">
        <span>Secure transmission demo · browser-side deterministic model</span>
        <span>ChaCha20 · Hamming (13,8) + overall parity · UART 8N1</span>
      </footer>
    </div>
  );
};
