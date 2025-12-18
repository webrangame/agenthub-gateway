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

interface CapabilityMapperProps {
  capabilities: string[];
}

const CapabilityLayoutMapper: React.FC<CapabilityMapperProps> = ({ capabilities }) => {
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
      <SplitLayout
        left={<ComponentFactory name={LeftCompName} props={{ isCollapsed: isLeftCollapsed, onToggleCollapse: () => setIsLeftCollapsed(!isLeftCollapsed) }} />}
        right={<ComponentFactory name={RightCompName} />}
        collapsed={isLeftCollapsed}
      />
    );
  }

  // Fallback / Default
  return (
    <div className="h-screen w-full flex items-center justify-center bg-gray-100">
      <SingleColLayout>
        <ComponentFactory name={layoutConfig.components[0]} />
      </SingleColLayout>
    </div>
  );
};

// Simple Factory to map string names to React Components
const ComponentFactory = ({ name, props = {} }: { name: string, props?: any }) => {
  switch (name) {
    case 'ChatBox': return <ChatPanel {...props} />;
    case 'FeedPanel': return <FeedPanel {...props} />;
    case 'Terminal': return <TerminalPanel {...props} />;
    default: return <div className="p-4 text-red-500">Unknown Component: {name}</div>;
  }
};

export default CapabilityLayoutMapper;









