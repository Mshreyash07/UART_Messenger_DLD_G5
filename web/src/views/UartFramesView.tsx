import React, { useState, useEffect } from "react";
import {
  Radio,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Binary,
  Layers,
  ArrowRight,
  Info
} from "lucide-react";
import { encodeHamming, packetizeHamming } from "../utils/hamming";

export const UartFramesView: React.FC = () => {
  const [dataByte, setDataByte] = useState<number>(0xa5); // 0xA5 = 10100101
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTick, setCurrentTick] = useState<number>(0); // 0 to 23 (2 frames of 10 bits each + idle states)

  const codeword = encodeHamming(dataByte);
  const [uartByteLow, uartByteHigh] = packetizeHamming(codeword);

  // 10 serial bit states for a UART 8N1 frame:
  // [0]: Start Bit (0)
  // [1..8]: Data Bits LSB first (b0..b7)
  // [9]: Stop Bit (1)
  const getFrameBits = (byteVal: number) => {
    const bits: { name: string; bitIdx: number | null; val: number; desc: string }[] = [
      { name: "START", bitIdx: null, val: 0, desc: "Start bit (active LOW: 0)" }
    ];
    for (let i = 0; i < 8; i++) {
      bits.push({
        name: `D${i}`,
        bitIdx: i,
        val: (byteVal >> i) & 1,
        desc: `Data bit ${i} (LSB-first)`
      });
    }
    bits.push({ name: "STOP", bitIdx: null, val: 1, desc: "Stop bit (active HIGH: 1)" });
    return bits;
  };

  const frame0Bits = getFrameBits(uartByteLow);
  const frame1Bits = getFrameBits(uartByteHigh);

  // All sequential serial states:
  // 0: IDLE (1)
  // 1..10: Frame 0 (Start + 8 bits + Stop)
  // 11: INTER-FRAME IDLE (1)
  // 12..21: Frame 1 (Start + 8 bits + Stop)
  // 22: FINAL IDLE (1)
  const serialTimeline: {
    stateIdx: number;
    phase: string;
    bitName: string;
    signalVal: number;
    frame: "NONE" | "FRAME_0" | "FRAME_1";
    explanation: string;
  }[] = [
    {
      stateIdx: 0,
      phase: "IDLE",
      bitName: "LINE IDLE",
      signalVal: 1,
      frame: "NONE",
      explanation: "Serial transmission line is held at logical HIGH (1) when idle."
    }
  ];

  frame0Bits.forEach((b, idx) => {
    serialTimeline.push({
      stateIdx: serialTimeline.length,
      phase: `FRAME 0 [${b.name}]`,
      bitName: b.name,
      signalVal: b.val,
      frame: "FRAME_0",
      explanation: `Frame 0 (Low byte c[7:0]): ${b.desc} transmitting value ${b.val}.`
    });
  });

  serialTimeline.push({
    stateIdx: serialTimeline.length,
    phase: "INTER-FRAME IDLE",
    bitName: "LINE IDLE",
    signalVal: 1,
    frame: "NONE",
    explanation: "Brief inter-frame idle transition between Low and High UART payload bytes."
  });

  frame1Bits.forEach((b, idx) => {
    serialTimeline.push({
      stateIdx: serialTimeline.length,
      phase: `FRAME 1 [${b.name}]`,
      bitName: b.name,
      signalVal: b.val,
      frame: "FRAME_1",
      explanation: `Frame 1 (High byte {000, c[12:8]}): ${b.desc} transmitting value ${b.val}.`
    });
  });

  serialTimeline.push({
    stateIdx: serialTimeline.length,
    phase: "IDLE",
    bitName: "LINE IDLE",
    signalVal: 1,
    frame: "NONE",
    explanation: "Transmission complete. Line returns to idle HIGH (1)."
  });

  const totalStates = serialTimeline.length;
  const activeStep = serialTimeline[currentTick] || serialTimeline[0];

  useEffect(() => {
    let interval: any = null;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTick((prev) => {
          if (prev >= totalStates - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 700);
    }
    return () => clearInterval(interval);
  }, [isPlaying, totalStates]);

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="card space-y-3">
        <div className="card-header">
          <div className="card-title">
            <Radio className="w-5 h-5 text-cyan-400" />
            <span>UART 8N1 Framing &amp; Codeword Packing Visualizer</span>
          </div>
          <span className="badge badge-cyan font-mono text-xs">
            rtl/uart_tx.v &amp; rtl/hamming_packetizer.v
          </span>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed">
          Standard 8N1 UART serial framing transmits each byte as 10 discrete bit intervals: an active-LOW
          Start bit (0), 8 Data bits in <strong>Least-Significant-Bit (LSB) first order</strong>, and an
          active-HIGH Stop bit (1).
        </p>

        <div className="p-3.5 rounded-lg bg-cyan-950/20 border border-cyan-500/30 text-xs text-cyan-200">
          <strong className="text-cyan-300">Dual-Byte Packing Architecture: </strong>
          To keep UART framing strictly standard 8-bit without modifying physical transceivers, our
          13-bit Hamming codeword is split across two UART payload bytes:
          <span className="font-mono text-cyan-300 block mt-1">
            • Frame 0 (LOW): codeword[7:0] → 10 serial bit periods
            <br />• Frame 1 (HIGH): {"{3'b000, codeword[12:8]}"} (3 zero padding bits) → 10 serial bit periods
          </span>
        </div>
      </div>

      {/* Interactive Step-Through Animation Controls */}
      <div className="card space-y-4">
        <div className="card-header">
          <div className="card-title text-sm">
            <span>Oscilloscope Stepping &amp; Waveform Player</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying((p) => !p)}
              className="btn btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? "Pause" : "Play Serial Animation"}</span>
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentTick((t) => Math.min(totalStates - 1, t + 1));
              }}
              className="btn btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1"
            >
              <SkipForward className="w-3.5 h-3.5" />
              <span>Step Next</span>
            </button>
            <button
              onClick={() => {
                setIsPlaying(false);
                setCurrentTick(0);
              }}
              className="btn btn-secondary text-xs py-1.5 px-2.5 flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Current State Diagnostic Banner */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-3 font-mono text-xs">
          <div className="flex items-center gap-3">
            <span className="badge badge-purple">
              Tick {activeStep.stateIdx} / {totalStates - 1}
            </span>
            <span className="text-white font-bold">{activeStep.phase}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-slate-400">TX Line Level:</span>
            <span
              className={`font-bold px-2 py-0.5 rounded ${
                activeStep.signalVal === 1
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                  : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
              }`}
            >
              {activeStep.signalVal === 1 ? "HIGH (1)" : "LOW (0)"}
            </span>
          </div>
        </div>

        {/* Oscilloscope Waveform Graphic */}
        <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-3">
          <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
            <span>TX SERIAL WAVEFORM (8N1 Timing Ticks)</span>
            <span>LSB → MSB Transmission</span>
          </div>

          <div className="flex items-end gap-1 h-24 pt-4 border-b border-slate-800 overflow-x-auto pb-2">
            {serialTimeline.map((step, idx) => {
              const isActive = currentTick === idx;
              const isHigh = step.signalVal === 1;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentTick(idx);
                  }}
                  className={`flex flex-col items-center justify-end h-full min-w-[2.2rem] flex-1 cursor-pointer transition-all ${
                    isActive ? "opacity-100 ring-2 ring-cyan-400 rounded" : "opacity-70 hover:opacity-100"
                  }`}
                >
                  {/* Waveform vertical block */}
                  <div
                    className={`w-full rounded-t transition-all ${
                      isHigh
                        ? isActive
                          ? "bg-cyan-400 h-14"
                          : "bg-cyan-600/70 h-14"
                        : isActive
                        ? "bg-amber-400 h-3"
                        : "bg-amber-600/70 h-3"
                    }`}
                  />
                  <div className="text-[9px] font-mono text-slate-400 mt-1 truncate max-w-full">
                    {step.bitName}
                  </div>
                  <div className="text-[10px] font-mono font-bold text-white">
                    {step.signalVal}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-xs text-slate-300 font-mono leading-relaxed pt-1">
            {activeStep.explanation}
          </p>
        </div>
      </div>

      {/* Codeword to Dual-Byte Packing Detail */}
      <div className="card space-y-4">
        <div className="card-header">
          <div className="card-title text-sm">
            <Binary className="w-4 h-4 text-emerald-400" />
            <span>Exact Codeword Packing Scheme (rtl/hamming_packetizer.v)</span>
          </div>
          <span className="text-xs font-mono text-cyan-400">
            Byte In: 0x{dataByte.toString(16).toUpperCase()} → 13-bit Codeword: 13'b
            {codeword.toString(2).padStart(13, "0")}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          {/* Frame 0 */}
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-semibold">
                FRAME 0: Byte 0 (Low 8 Codeword Bits)
              </span>
              <span className="text-cyan-400 font-bold">
                0x{uartByteLow.toString(16).padStart(2, "0").toUpperCase()}
              </span>
            </div>
            <div className="text-slate-400 text-[11px]">
              Assigned directly from <code className="text-cyan-300">codeword[7:0]</code>:
            </div>
            <div className="grid grid-cols-8 gap-1 pt-1">
              {[7, 6, 5, 4, 3, 2, 1, 0].map((i) => (
                <div key={i} className="p-1 rounded bg-slate-900 border border-slate-800 text-center">
                  <div className="text-[9px] text-slate-500">c[{i}]</div>
                  <div className="font-bold text-white mt-0.5">{(uartByteLow >> i) & 1}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Frame 1 */}
          <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-semibold">
                FRAME 1: Byte 1 (Upper 5 Bits + 3 Pad Bits)
              </span>
              <span className="text-cyan-400 font-bold">
                0x{uartByteHigh.toString(16).padStart(2, "0").toUpperCase()}
              </span>
            </div>
            <div className="text-slate-400 text-[11px]">
              Assigned as <code className="text-cyan-300">{"{3'b000, codeword[12:8]}"}</code>:
            </div>
            <div className="grid grid-cols-8 gap-1 pt-1">
              {[7, 6, 5, 4, 3, 2, 1, 0].map((i) => {
                const isPad = i >= 5;
                return (
                  <div
                    key={i}
                    className={`p-1 rounded border text-center ${
                      isPad
                        ? "bg-slate-950/80 border-slate-800 text-slate-500"
                        : "bg-slate-900 border-slate-800 text-white"
                    }`}
                  >
                    <div className="text-[9px] text-slate-500">
                      {isPad ? "0" : `c[${i + 8}]`}
                    </div>
                    <div className="font-bold mt-0.5">{(uartByteHigh >> i) & 1}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
