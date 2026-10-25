import React from "react";
import {
  ExternalLink,
  Github
} from "lucide-react";

export type NavTab =
  | "walkthrough"
  | "overview"
  | "messenger"
  | "chacha20"
  | "hamming"
  | "uart_frames"
  | "rtl"
  | "tb"
  | "docs"
  | "about";

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const navTabs: { id: NavTab; label: string }[] = [
    { id: "walkthrough", label: "Walkthrough Lab" },
    { id: "overview", label: "Architecture" },
    { id: "messenger", label: "Full Messenger" },
    { id: "chacha20", label: "ChaCha20 Core" },
    { id: "hamming", label: "Hamming SECDED" },
    { id: "uart_frames", label: "UART Frames" },
    { id: "rtl", label: "Verilog RTL" },
    { id: "tb", label: "Testbenches (9/9)" },
    { id: "docs", label: "Waveforms & Report" },
    { id: "about", label: "Group 5" }
  ];

  return (
    <header className="topbar">
      {/* Brand logo & title matching Replit */}
      <div className="brand" onClick={() => setActiveTab("walkthrough")}>
        <span className="brand-mark">ST</span>
        <span>
          Secure Transmission <span style={{ color: "#8b938d", fontWeight: 500 }}>/ lab</span>
        </span>
      </div>

      {/* Navigation Pills */}
      <nav className="top-nav">
        {navTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`nav-pill ${activeTab === tab.id ? "active" : ""}`}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Top Meta & Status */}
      <div className="top-meta">
        <span className="hidden md:inline-flex items-center">
          <i className="health-dot" />
          <span>Model active · v1.0</span>
        </span>
        <a
          href="https://github.com/Mshreyash07/UART_Messenger_DLD_G5"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-quiet flex items-center gap-1.5 text-xs"
        >
          <Github size={12} />
          <span>GitHub</span>
          <ExternalLink size={10} color="#8a938e" />
        </a>
      </div>
    </header>
  );
};
