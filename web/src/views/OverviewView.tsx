import React, { useState } from "react";
import {
  ShieldCheck,
  Binary,
  Radio,
  Cpu,
  ArrowRight,
  GitBranch,
  FileCode2,
  CheckCircle2,
  Layers,
  Terminal,
  Activity,
  Maximize2
} from "lucide-react";
import { RTL_MODULES } from "../data/sourceData";
import { NavTab } from "../components/Navbar";

interface OverviewViewProps {
  onNavigate: (tab: NavTab, targetModule?: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ onNavigate }) => {
  const [selectedModuleId, setSelectedModuleId] = useState<string>("uart_top.v");

  const selectedModule = RTL_MODULES.find((m) => m.file === selectedModuleId);

  const architectureBlocks = [
    {
      id: "chacha20_encrypt.v",
      title: "ChaCha20 Encrypt",
      type: "crypto",
      tag: "RFC 7539",
      desc: "XOR stream cipher with 256-bit key & 96-bit nonce"
    },
    {
      id: "uart_top.v",
      title: "Packet Header Gen",
      type: "protocol",
      tag: "16 Bytes",
      desc: "Attaches Sync (0xC3, 0x5A), 12B Nonce, 2B Length"
    },
    {
      id: "hamming_encoder.v",
      title: "Hamming (13,8) Enc",
      type: "ecc",
      tag: "SECDED",
      desc: "Encodes 8-bit packet byte into 13-bit codeword"
    },
    {
      id: "hamming_packetizer.v",
      title: "Hamming Packetizer",
      type: "framing",
      tag: "13b → 2 Bytes",
      desc: "Splits 13-bit word: Byte 0 = c[7:0], Byte 1 = {000, c[12:8]}"
    },
    {
      id: "fifo.v",
      title: "TX FIFO Buffer",
      type: "buffer",
      tag: "16x8 Depth",
      desc: "Buffers UART bytes before serialization"
    },
    {
      id: "uart_tx.v",
      title: "UART 8N1 TX",
      type: "serial",
      tag: "9600 Baud",
      desc: "Serializes byte: Start (0) + 8 Data (LSB) + Stop (1)"
    },
    {
      id: "uart_rx.v",
      title: "UART 8N1 RX",
      type: "serial",
      tag: "Oversampling",
      desc: "Mid-bit sampling (CLKS/2) and byte reconstruction"
    },
    {
      id: "hamming_depacketizer.v",
      title: "Hamming Depacketizer",
      type: "framing",
      tag: "2 Bytes → 13b",
      desc: "Reassembles 13-bit word & checks 3-bit zero padding"
    },
    {
      id: "hamming_decoder.v",
      title: "Hamming (13,8) Dec",
      type: "ecc",
      tag: "Correction",
      desc: "Syndrome & parity check: fixes 1-bit error, flags 2-bit error"
    },
    {
      id: "chacha20_decrypt.v",
      title: "ChaCha20 Decrypt",
      type: "crypto",
      tag: "Symmetric XOR",
      desc: "Recovers plaintext using matched keystream"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Top Hero Banner */}
      <div className="card bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-cyan-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge badge-cyan">CS203 Digital Logic Design</span>
              <span className="badge badge-emerald">Group 5 Project</span>
              <span className="badge badge-purple">Verilog Simulation</span>
              <span className="badge badge-amber">Single Top: uart_top.v</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              UART-Based Secure Digital Communication System
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-3xl leading-relaxed">
              An interactive demonstration and technical explorer for our student-designed 8-bit UART
              secure communication pipeline. Integrates ChaCha20 symmetric stream cipher encryption with
              Extended Hamming (13,8) SECDED error correction, circular FIFO buffering, and UART 8N1 serial framing.
            </p>
          </div>
          <div className="flex flex-wrap lg:flex-col gap-2 shrink-0">
            <button
              onClick={() => onNavigate("messenger")}
              className="btn btn-primary text-sm flex items-center gap-2 shadow-lg shadow-cyan-950"
            >
              <span>Launch Live Messenger</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigate("rtl", "uart_top.v")}
              className="btn btn-secondary text-sm flex items-center gap-2"
            >
              <FileCode2 className="w-4 h-4 text-cyan-400" />
              <span>Explore Verilog RTL</span>
            </button>
          </div>
        </div>

        {/* Quick Spec Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800 text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <div className="text-slate-400">System Clock</div>
            <div className="text-cyan-300 font-semibold text-sm mt-0.5">50 MHz</div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <div className="text-slate-400">UART Framing</div>
            <div className="text-cyan-300 font-semibold text-sm mt-0.5">8N1 (LSB 1st)</div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <div className="text-slate-400">Serial Baud Rate</div>
            <div className="text-cyan-300 font-semibold text-sm mt-0.5">9,600 Baud</div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <div className="text-slate-400">Encryption</div>
            <div className="text-cyan-300 font-semibold text-sm mt-0.5">ChaCha20 256b</div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <div className="text-slate-400">Error Correction</div>
            <div className="text-cyan-300 font-semibold text-sm mt-0.5">Hamming (13,8)</div>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
            <div className="text-slate-400">Verification</div>
            <div className="text-emerald-400 font-semibold text-sm mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> 9/9 Pass
            </div>
          </div>
        </div>
      </div>

      {/* Real Communication Pipeline Order */}
      <div className="card space-y-4">
        <div className="card-header">
          <div className="card-title">
            <GitBranch className="w-5 h-5 text-cyan-400" />
            <span>Implemented Communication Pipeline</span>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Verified strictly against rtl/uart_top.v
          </span>
        </div>

        <p className="text-sm text-slate-300">
          The verified transmission order transforms host bytes step-by-step through cryptographic
          keystream mixing, 16-byte protocol header attachment, SECDED codeword generation, and UART serial framing:
        </p>

        {/* Step-by-step pipeline pills */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-2">
          {[
            { step: "1", title: "Plaintext Input", desc: "User payload string / byte stream", color: "border-slate-700 bg-slate-900" },
            { step: "2", title: "ChaCha20 Encryption", desc: "Bitwise XOR with keystream byte", color: "border-cyan-500/40 bg-cyan-950/20" },
            { step: "3", title: "Packet Header", desc: "Sync (C3 5A) + 12B Nonce + 2B Length", color: "border-purple-500/40 bg-purple-950/20" },
            { step: "4", title: "Hamming (13,8) Enc", desc: "Generates 4 parity + 1 overall parity", color: "border-emerald-500/40 bg-emerald-950/20" },
            { step: "5", title: "Hamming Packetizer", desc: "13-bit word → 2 UART payload bytes", color: "border-amber-500/40 bg-amber-950/20" },
            { step: "6", title: "TX FIFO & UART TX", desc: "8N1 serial frame (Start + 8b + Stop)", color: "border-rose-500/40 bg-rose-950/20" },
            { step: "7", title: "UART RX Sampling", desc: "Mid-bit oversampling recovers bytes", color: "border-rose-500/40 bg-rose-950/20" },
            { step: "8", title: "Hamming Depacketizer", desc: "2 bytes → 13-bit word + padding check", color: "border-amber-500/40 bg-amber-950/20" },
            { step: "9", title: "Hamming (13,8) Dec", desc: "Corrects 1-bit, flags 2-bit errors", color: "border-emerald-500/40 bg-emerald-950/20" },
            { step: "10", title: "ChaCha20 Decrypt", desc: "Symmetric keystream recovers text", color: "border-cyan-500/40 bg-cyan-950/20" }
          ].map((item) => (
            <div key={item.step} className={`p-3 rounded-lg border ${item.color} space-y-1`}>
              <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                <span>Stage {item.step}</span>
              </div>
              <div className="font-semibold text-xs text-white">{item.title}</div>
              <div className="text-[11px] text-slate-400">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Architecture Block Diagram */}
      <div className="card space-y-4">
        <div className="card-header">
          <div className="card-title">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <span>Interactive Module Architecture Diagram</span>
          </div>
          <span className="text-xs text-slate-400">
            Click any module below to inspect its specifications and jump to its Verilog RTL
          </span>
        </div>

        {/* Clickable Modules Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {architectureBlocks.map((block) => {
            const isSelected = selectedModuleId === block.id;
            return (
              <button
                key={block.id}
                onClick={() => setSelectedModuleId(block.id)}
                className={`text-left p-3.5 rounded-lg border transition-all ${
                  isSelected
                    ? "border-cyan-400 bg-cyan-500/10 shadow-md shadow-cyan-950 ring-1 ring-cyan-500/30"
                    : "border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900"
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1.5">
                  <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                    {block.tag}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">.v</span>
                </div>
                <div className="font-semibold text-xs text-slate-100">{block.title}</div>
                <div className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                  {block.desc}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Module Detail Card */}
        {selectedModule && (
          <div className="mt-4 p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-cyan-400">
                    {selectedModule.file}
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    (module {selectedModule.name})
                  </span>
                  <span className="badge badge-purple">{selectedModule.category}</span>
                </div>
                <h4 className="text-sm font-semibold text-slate-200 mt-0.5">
                  {selectedModule.title}
                </h4>
              </div>
              <button
                onClick={() => onNavigate("rtl", selectedModule.file)}
                className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
              >
                <FileCode2 className="w-3.5 h-3.5" />
                <span>View Full Verilog Source</span>
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{selectedModule.summary}</p>

            {/* Ports Preview */}
            <div className="pt-2 border-t border-slate-900">
              <div className="text-[11px] font-mono font-semibold text-slate-400 mb-2">
                KEY PORTS & SIGNALS ({selectedModule.ports.length} total)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs font-mono">
                {selectedModule.ports.slice(0, 6).map((p) => (
                  <div
                    key={p.name}
                    className="p-2 rounded bg-slate-900/80 border border-slate-800/80 flex items-center justify-between"
                  >
                    <span className="text-slate-200">{p.name}</span>
                    <span
                      className={`text-[10px] px-1 rounded ${
                        p.dir === "input"
                          ? "bg-cyan-500/10 text-cyan-400"
                          : "bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
                      {p.dir} [{p.width}]
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Protocol Framing & Bit Expansion Reference */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Packet Header Specification */}
        <div className="card space-y-3">
          <div className="card-header">
            <div className="card-title text-sm">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>16-Byte Hardware Protocol Header</span>
            </div>
            <span className="badge badge-cyan font-mono text-[10px]">uart_top.v</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Every transmitted message packet begins with an unencrypted, Hamming-protected 16-byte
            synchronization and control header:
          </p>
          <div className="space-y-1.5 font-mono text-xs">
            <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-cyan-400 font-semibold">Bytes 0–1</span>
              <span className="text-slate-200">0xC3, 0x5A</span>
              <span className="text-slate-400 text-[11px]">Sync Bytes (Frame Acquisition)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-cyan-400 font-semibold">Bytes 2–9</span>
              <span className="text-slate-200">nonce_prefix[63:0]</span>
              <span className="text-slate-400 text-[11px]">64-bit Nonce Prefix (Host ID)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-cyan-400 font-semibold">Bytes 10–13</span>
              <span className="text-slate-200">nonce_counter[31:0]</span>
              <span className="text-slate-400 text-[11px]">32-bit Anti-Replay Counter</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-cyan-400 font-semibold">Bytes 14–15</span>
              <span className="text-slate-200">length[15:8], length[7:0]</span>
              <span className="text-slate-400 text-[11px]">Payload Length in Bytes</span>
            </div>
          </div>
        </div>

        {/* Data Expansion Ratio */}
        <div className="card space-y-3">
          <div className="card-header">
            <div className="card-title text-sm">
              <Binary className="w-4 h-4 text-emerald-400" />
              <span>Data Expansion & Bandwidth Profile</span>
            </div>
            <span className="badge badge-emerald font-mono text-[10px]">8N1 UART</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Due to the modular separation of Hamming encoding and UART framing, each 8-bit byte expands
            into two physical UART payload bytes:
          </p>
          <div className="space-y-1.5 font-mono text-xs">
            <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">1 Plaintext Byte</span>
              <span className="text-cyan-300">1 Ciphertext Byte (8 bits)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Hamming Encoding</span>
              <span className="text-purple-300">1 Codeword (13 bits: 8 data, 4 parity, 1 overall)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Packetization</span>
              <span className="text-amber-300">2 UART Bytes (16 bits: 3 zero pad + 13 bits)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800">
              <span className="text-slate-400">Serial Framing</span>
              <span className="text-emerald-300">20 Baud Bit Periods (2x [Start + 8 Data + Stop])</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
