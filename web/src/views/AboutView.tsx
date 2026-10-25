import React from "react";
import { Users, GraduationCap, Github, BookOpen, CheckCircle2, ShieldCheck, Terminal, Cpu } from "lucide-react";
import { DOCUMENTATION } from "../data/sourceData";

export const AboutView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* College Project & Course Banner */}
      <div className="card space-y-4">
        <div className="card-header">
          <div className="card-title">
            <GraduationCap className="w-5 h-5 text-cyan-400" />
            <span>Digital Logic Design (CS203) — Group 5 Project</span>
          </div>
          <span className="badge badge-cyan font-mono text-xs">Semester 3</span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          This project implements a secure digital communication system using Verilog HDL and verified
          through behavioral and cycle-accurate RTL simulation. Built specifically to demonstrate
          synchronous finite-state machine (FSM) control, symmetric stream cryptography, and forward
          error correction to our course professor and evaluation panel.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 text-xs font-mono">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="text-slate-400">Course Code</div>
            <div className="text-white font-bold text-sm mt-0.5">CS203 Digital Logic Design</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="text-slate-400">Project Group</div>
            <div className="text-cyan-400 font-bold text-sm mt-0.5">Group 5</div>
          </div>
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <div className="text-slate-400">GitHub Repository</div>
            <a
              href="https://github.com/Mshreyash07/G5_DLD_UART_Messenger"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300 font-bold text-sm mt-0.5 block truncate"
            >
              Mshreyash07/G5_DLD_UART_Messenger
            </a>
          </div>
        </div>
      </div>

      {/* Team Members Grid */}
      <div className="card space-y-4">
        <div className="card-header">
          <div className="card-title">
            <Users className="w-5 h-5 text-cyan-400" />
            <span>Team Members &amp; Core Contributions</span>
          </div>
          <span className="text-xs text-slate-400 font-mono">5 Student Engineers</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DOCUMENTATION.team.map((member, idx) => (
            <div
              key={idx}
              className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-2 hover:border-slate-700 transition-all"
            >
              <div className="flex items-center justify-between">
                <span className="badge badge-cyan font-mono text-[11px]">{member.roll}</span>
                <span className="text-[10px] text-slate-500 font-mono">Member #{idx + 1}</span>
              </div>
              <div className="font-bold text-sm text-white">{member.name}</div>
              <div className="text-xs text-cyan-300 font-mono pt-1 border-t border-slate-900">
                {member.role}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Viva / Evaluation Quick Reference */}
      <div className="card space-y-4">
        <div className="card-header">
          <div className="card-title text-sm">
            <BookOpen className="w-4 h-4 text-emerald-400" />
            <span>Key Project Viva Discussion Points</span>
          </div>
          <span className="badge badge-emerald font-mono text-[10px]">Viva Defense</span>
        </div>

        <div className="space-y-3 text-xs text-slate-300 leading-relaxed font-sans">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <strong className="text-cyan-300 font-mono text-sm block">
              1. Why separate Hamming encoding from UART framing?
            </strong>
            <p>
              By encoding each 8-bit byte into a 13-bit Hamming codeword and then splitting it into two
              standard 8-bit UART bytes (one with 3 zero padding bits), the physical serial transceiver
              remains standard 8N1 (8 data bits, no parity, 1 stop bit). This ensures compatibility with
              commercial FTDI chips, USB-to-UART bridges, and standard serial analyzers without non-standard
              bit lengths.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <strong className="text-cyan-300 font-mono text-sm block">
              2. How does Extended Hamming (13,8) achieve SECDED?
            </strong>
            <p>
              Standard Hamming (12,8) has minimum distance d_min = 3, allowing single-error correction or
              double-error detection, but not both simultaneously. By adding an overall parity bit (bit 12)
              computed as the XOR sum of all 12 bits, the code distance increases to d_min = 4. This makes
              it SECDED: if syndrome != 0 and overall parity is 1, a single bit error is corrected. If
              syndrome != 0 and overall parity is 0, a double-bit error is detected.
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <strong className="text-cyan-300 font-mono text-sm block">
              3. Why is ChaCha20 used over AES for this FPGA/Verilog project?
            </strong>
            <p>
              ChaCha20 is based on simple 32-bit Add-Rotate-XOR (ARX) operations that synthesize efficiently
              without requiring large S-boxes or lookup tables. It does not suffer from timing cache attacks
              in hardware and operates directly as a stream cipher, eliminating the need for block cipher
              padding modes (e.g. PKCS#7).
            </p>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
            <strong className="text-cyan-300 font-mono text-sm block">
              4. How does the receiver handle clock drift or frequency mismatches?
            </strong>
            <p>
              The UART receiver (<code className="text-cyan-300">uart_rx.v</code>) implements mid-bit oversampling.
              Upon detecting the falling edge of the start bit, it counts half a bit period
              (<code className="text-cyan-300">CLKS_PER_BIT / 2</code>) to align directly in the center of the start bit,
              and then samples subsequent data bits every full bit period (<code className="text-cyan-300">CLKS_PER_BIT</code>).
              This guarantees maximum noise margin and tolerates clock variations up to ±3%.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
