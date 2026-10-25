import React, { useState } from "react";
import { Navbar, NavTab } from "./components/Navbar";
import { ReplitWalkthroughView } from "./views/ReplitWalkthroughView";
import { OverviewView } from "./views/OverviewView";
import { MessengerView } from "./views/MessengerView";
import { ChaCha20View } from "./views/ChaCha20View";
import { HammingView } from "./views/HammingView";
import { UartFramesView } from "./views/UartFramesView";
import { RtlExplorerView } from "./views/RtlExplorerView";
import { TestbenchView } from "./views/TestbenchView";
import { DocumentationView } from "./views/DocumentationView";
import { AboutView } from "./views/AboutView";

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTab>("walkthrough");
  const [targetRtlModule, setTargetRtlModule] = useState<string>("uart_top.v");

  const handleNavigate = (tab: NavTab, targetModule?: string) => {
    if (targetModule) {
      setTargetRtlModule(targetModule);
    }
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="bench-shell">
      {/* Top Bar Navigation */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Page Content */}
      <main className="page-wrap">
        {activeTab === "walkthrough" && <ReplitWalkthroughView onNavigateTab={handleNavigate} />}
        {activeTab === "overview" && <OverviewView onNavigate={handleNavigate} />}
        {activeTab === "messenger" && <MessengerView />}
        {activeTab === "chacha20" && <ChaCha20View />}
        {activeTab === "hamming" && <HammingView />}
        {activeTab === "uart_frames" && <UartFramesView />}
        {activeTab === "rtl" && <RtlExplorerView initialFile={targetRtlModule} />}
        {activeTab === "tb" && <TestbenchView />}
        {activeTab === "docs" && <DocumentationView />}
        {activeTab === "about" && <AboutView />}
      </main>
    </div>
  );
};

export default App;
