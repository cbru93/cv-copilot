'use client';

import { 
  Button, 
  Alert, 
  Heading, 
  Card, 
  Paragraph,
  Tag, 
  Switch 
} from '@digdir/designsystemet-react';
import { useState } from 'react';

export default function DesignSystemTest() {
  const [isChecked, setIsChecked] = useState(false);

  return (
    <div className="space-y-6">
      <Heading level={2} data-size="md">
        Designsystemet Components
      </Heading>
      
      <Alert data-color="success">
        Designsystemet is configured!
      </Alert>
      
      <Card>
        <Card.Block>
          <Heading level={3} data-size="xs">Button Examples</Heading>
          <div className="flex gap-2 mt-2">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="tertiary">Tertiary</Button>
          </div>
        </Card.Block>
      </Card>
      
      <div className="flex gap-4">
        <Tag data-color="success">Success</Tag>
        <Tag data-color="danger">Error</Tag>
        <Tag data-color="warning">Warning</Tag>
        <Tag data-color="info">Info</Tag>
      </div>
      
      <div className="flex items-center gap-2">
        <Switch 
          checked={isChecked} 
          onChange={() => setIsChecked(!isChecked)}
          aria-label="Demo switch"
        />
        <Paragraph>
          Switch is {isChecked ? 'ON' : 'OFF'}
        </Paragraph>
      </div>
    </div>
  );
} 