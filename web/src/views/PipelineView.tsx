import React from "react";
import { GitBranch, ArrowRight, ShieldCheck, Binary, Radio, Cpu, CheckCircle2 } from "lucide-react";
import { NavTab } from "../components/Navbar";

interface PipelineViewProps {
  onNavigate: (tab: NavTab, targetModule?: string) => void;
}

export const PipelineView: React.FC<PipelineViewProps> = ({ onNavigate }) => {
  const stages = [
    {
      num: 1,
      title: "Host Plaintext Streaming",
      domain: "Host Interface",
      module: "uart_top.v",
      input: "Raw ASCII String or 8-bit Byte Stream (e.g. 'Hello')",
      output: "tx_data[7:0] with tx_data_valid strobe",
      desc: "The host begins by presenting the message length (tx_message_length) and pulsing tx_message_start. Top-level handshake tx_data_ready controls flow.",
      spec: "Variable length up to 65,535 bytes per packet."
    },
    {
      num: 2,
      title: "ChaCha20 Stream Encryption",
      domain: "Cryptographic Core",
      module: "chacha20_encrypt.v",
      input: "tx_data[7:0] + ChaCha20 Keystream Byte",
      output: "Ciphertext Byte: enc_out_data[7:0]",
      desc: "The ChaCha20 core generates 64-byte blocks from the 256-bit Key, 96-bit Nonce, and 32-bit Counter (starting at 1). Encryption is a single-cycle bitwise XOR.",
      spec: "RFC 7539 / 8439 20 rounds (10 column + 10 diagonal rounds)."
    },
    {
      num: 3,
      title: "16-Byte Protocol Header Assembly",
      domain: "FSM Control",
      module: "uart_top.v",
      input: "Nonce Prefix (64b), Nonce Counter (32b), Message Length (16b)",
      output: "16 Header Bytes: [0xC3, 0x5A, Nonce (12B), Length (2B)]",
      desc: "Before sending ciphertext payload, the transmitter injects the 16-byte unencrypted synchronization header. Nonce counter increments per packet.",
      spec: "Ensures unique nonce per packet and explicit frame boundary detection."
    },
    {
      num: 4,
      title: "Hamming SECDED (13,8) Encoding",
      domain: "Error Correction",
      module: "hamming_encoder.v",
      input: "8-bit Packet Byte: data_in[7:0] (Header or Ciphertext)",
      output: "13-bit Codeword: codeword_out[12:0]",
      desc: "Every single byte is individually encoded into a 13-bit codeword with 4 parity bits (p1, p2, p4, p8) and 1 overall parity bit (p_all at bit 12).",
      spec: "Systematic SECDED code with minimum Hamming distance d_min = 4."
    },
    {
      num: 5,
      title: "Hamming Codeword Packetization",
      domain: "Framing",
      module: "hamming_packetizer.v",
      input: "13-bit Codeword: codeword_in[12:0]",
      output: "Two 8-bit UART Payload Bytes",
      desc: "Byte 0 = codeword[7:0], Byte 1 = {3'b000, codeword[12:8]}. Serializes the 13-bit word into two standard 8-bit bytes for transmission.",
      spec: "Top 3 bits of Byte 1 are reserved as zero padding."
    },
    {
      num: 6,
      title: "FIFO Buffering & UART 8N1 Transmission",
      domain: "Serial Subsystem",
      module: "fifo.v & uart_tx.v",
      input: "Formatted 8-bit UART Payload Bytes",
      output: "Serial Bitstream on 'tx' pin (Active LOW Start, 8 Data LSB-first, Stop)",
      desc: "Bytes are queued in a 16-deep FIFO, then serialized by uart_tx at 9600 baud, timed by baud_gen tick pulses.",
      spec: "Each UART byte takes 10 baud intervals. Total 20 baud intervals per codeword."
    },
    {
      num: 7,
      title: "UART 8N1 Oversampling Reception",
      domain: "Serial Subsystem",
      module: "uart_rx.v",
      input: "Serial Bitstream on 'rx' pin",
      output: "rx_data[7:0] with rx_done strobe",
      desc: "Synchronizes the incoming line through a 2-stage flip-flop, detects falling edge start bit, and samples at mid-bit (CLKS_PER_BIT / 2).",
      spec: "Robust clock drift rejection and framing verification."
    },
    {
      num: 8,
      title: "Hamming Codeword Depacketization",
      domain: "Framing",
      module: "hamming_depacketizer.v",
      input: "Two 8-bit UART Bytes from Receiver",
      output: "Reassembled 13-bit Codeword + Format Error Flag",
      desc: "Collects the low byte and high byte. Verifies byte_data[7:5] == 3'b000; flags format_error if padding bits are corrupted.",
      spec: "Reconstitutes codeword_out <= {byte1[4:0], byte0}."
    },
    {
      num: 9,
      title: "Hamming SECDED Decoding & Correction",
      domain: "Error Correction",
      module: "hamming_decoder.v",
      input: "13-bit Codeword: codeword_in[12:0]",
      output: "Corrected 8-bit Byte: data_out[7:0]",
      desc: "Computes 4 syndrome bits and overall parity. Corrects any single-bit transmission error or asserts double_error_detected.",
      spec: "Exhaustively verified across all 23,552 error-injection scenarios in tb_hamming_decoder."
    },
    {
      num: 10,
      title: "Packet Parsing & ChaCha20 Decryption",
      domain: "Cryptographic Core",
      module: "uart_top.v & chacha20_decrypt.v",
      input: "Corrected Packet Stream",
      output: "Recovered Plaintext Stream: rx_data[7:0] with rx_data_valid",
      desc: "FSM waits for Sync (0xC3, 0x5A), extracts 12-byte Nonce and 2-byte Length, initializes ChaCha20 decryption, and outputs recovered plaintext.",
      spec: "Asserts rx_data_last on the final byte and rx_message_done."
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card space-y-3">
        <div className="card-header">
          <div className="card-title">
            <GitBranch className="w-5 h-5 text-cyan-400" />
            <span>Complete Transmission Pipeline Architecture</span>
          </div>
          <span className="badge badge-cyan font-mono text-xs">uart_top.v End-to-End</span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          The complete hardware pipeline spans 10 distinct operational phases. Every stage maintains
          strict synchronous handshaking and state isolation to guarantee that cryptographic confidentiality
          and error correction are completely decoupled from physical UART serialization.
        </p>
      </div>

      {/* Sequential Pipeline Cards */}
      <div className="space-y-4">
        {stages.map((stage) => (
          <div
            key={stage.num}
            className="p-4 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-all space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center font-mono font-bold text-xs text-cyan-400">
                  {stage.num}
                </span>
                <span className="font-semibold text-sm text-white">{stage.title}</span>
                <span className="badge badge-purple text-[10px]">{stage.domain}</span>
              </div>
              <button
                onClick={() => onNavigate("rtl", stage.module)}
                className="text-xs text-cyan-400 hover:text-cyan-300 font-mono flex items-center gap-1"
              >
                <span>{stage.module}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{stage.desc}</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-900 font-mono text-xs">
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800/80">
                <div className="text-[10px] text-slate-400">INPUT SIGNAL</div>
                <div className="text-slate-200 mt-0.5 truncate">{stage.input}</div>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800/80">
                <div className="text-[10px] text-slate-400">OUTPUT SIGNAL</div>
                <div className="text-cyan-300 mt-0.5 truncate">{stage.output}</div>
              </div>
              <div className="p-2 rounded bg-slate-900/60 border border-slate-800/80">
                <div className="text-[10px] text-slate-400">SPECIFICATION / PARAMETER</div>
                <div className="text-emerald-300 mt-0.5 truncate">{stage.spec}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
