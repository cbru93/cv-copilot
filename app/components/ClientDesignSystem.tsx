'use client';

import { useState, useEffect } from 'react';
import { Card, Heading } from '@digdir/designsystemet-react';
import DesignSystemTest from './DesignSystemTest';

export default function ClientDesignSystem() {
  const [showDesignSystem, setShowDesignSystem] = useState<boolean>(false);
  
  // Read the state from the DesignSystemToggle component
  useEffect(() => {
    const toggleButton = document.querySelector('[data-showdesignsystem]');
    if (toggleButton) {
      const isShown = toggleButton.getAttribute('data-showdesignsystem') === 'true';
      setShowDesignSystem(isShown);
    }
    
    // Set up a mutation observer to watch for attribute changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-showdesignsystem' && toggleButton) {
          const isShown = toggleButton.getAttribute('data-showdesignsystem') === 'true';
          setShowDesignSystem(isShown);
        }
      });
    });
    
    if (toggleButton) {
      observer.observe(toggleButton, { attributes: true });
    }
    
    return () => observer.disconnect();
  }, []);
  
  if (!showDesignSystem) return null;
  
  return (
    <Card className="mb-8">
      <Card.Block>
        <Heading level={2} data-size="sm">Design System Demo</Heading>
      </Card.Block>
      <Card.Block>
        <DesignSystemTest />
      </Card.Block>
    </Card>
  );
} 