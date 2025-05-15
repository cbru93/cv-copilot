'use client';

import { useState } from 'react';
import { Button } from '@digdir/designsystemet-react';

export default function DesignSystemToggle() {
  const [showDesignSystem, setShowDesignSystem] = useState<boolean>(false);
  
  // Use a server action to store the preference if needed in the future
  
  return (
    <Button 
      variant="primary"
      onClick={() => setShowDesignSystem(!showDesignSystem)}
      className="mt-4"
      data-showdesignsystem={showDesignSystem}
    >
      {showDesignSystem ? 'Hide' : 'Show'} Design System Components
    </Button>
  );
} 