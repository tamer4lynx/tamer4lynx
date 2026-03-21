import React from 'react';
import { Box, Text } from 'ink';

export type WizardProps = {
  step: number;
  total: number;
  title?: string;
  children: React.ReactNode;
};

export function Wizard({ step, total, title, children }: WizardProps) {
  return (
    <Box flexDirection="column">
      <Text dimColor>
        Step {step}/{total}
        {title ? ` — ${title}` : ''}
      </Text>
      <Box marginTop={1} flexDirection="column">
        {children}
      </Box>
    </Box>
  );
}
