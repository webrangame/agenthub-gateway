'use client';

import React, { useEffect, useState } from 'react';
import spec from './fastgraph-ui-spec.json';

// Layout Imports (Skeleton for now)
import SplitLayout from './layouts/SplitLayout';
import SingleColLayout from './layouts/SingleColLayout'; // We need to create this

// Component Imports (Skeleton)
import ChatPanel from './components/ChatPanel';
import FeedPanel from './components/FeedPanel';
import TerminalPanel from './components/TerminalPanel'; // Placeholder
import AiFooter from './components/AiFooter';

interface CapabilityMapperProps {
  capabilities: string[];
  onLogout?: () => void;
}

const CapabilityLayoutMapper: React.FC<CapabilityMapperProps> = ({ capabilities, onLogout }) => {
  const [layoutConfig, setLayoutConfig] = useState<any>(null);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);

  useEffect(() => {
    // 1. Find the first capability that matches a known layout in the spec
    // In a real app, we might merge capabilities or have a priority order.
    // For now, we take the *last* matching capability to override defaults.
    let matchedCapability = 'chat'; // Default

    for (const cap of capabilities) {
      if (spec.capabilities[cap as keyof typeof spec.capabilities]) {
        matchedCapability = cap;
      }
    }

    setLayoutConfig(spec.capabilities[matchedCapability as keyof typeof spec.capabilities]);
  }, [capabilities]);

  if (!layoutConfig) return <div>Loading Layout...</div>;

  // 2. Map Layout Name to Actual Component
  // spec.layout: "split_view" | "single_col"

  if (layoutConfig.layout === 'split_view') {
    // We expect 2 components for split view
    const [LeftCompName, RightCompName] = layoutConfig.components;

    return (
      <div className="flex flex-col h-screen overflow-hidden">
        <div className="flex-1 overflow-hidden relative">
          <SplitLayout
            left={
              <ComponentFactory
                name={LeftCompName}
                props={{
                  isCollapsed: isLeftCollapsed,
                  onToggleCollapse: () => setIsLeftCollapsed(!isLeftCollapsed),
                }}
                onLogout={onLogout}
              />
            }
            right={<ComponentFactory name={RightCompName} onLogout={onLogout} />}
            collapsed={isLeftCollapsed}
          />
        </div>
        <AiFooter />
      </div>
    );
  }

  // Fallback / Default
  return (
    <div className="flex flex-col h-screen overflow-hidden bg-gray-100">
      <div className="flex-1 w-full flex items-center justify-center overflow-hidden">
        <SingleColLayout>
          <ComponentFactory name={layoutConfig.components[0]} onLogout={onLogout} />
        </SingleColLayout>
      </div>
      <AiFooter />
    </div>
  );
};

// Simple Factory to map string names to React Components
const ComponentFactory = ({ name, props = {}, onLogout }: { name: string; props?: any; onLogout?: () => void }) => {
  switch (name) {
    case 'ChatBox': return <ChatPanel {...props} />;
    case 'FeedPanel': return <FeedPanel onLogout={onLogout} />;
    case 'Terminal': return <TerminalPanel {...props} />;
    default: return <div className="p-4 text-red-500">Unknown Component: {name}</div>;
  }
};

export default CapabilityLayoutMapper;









