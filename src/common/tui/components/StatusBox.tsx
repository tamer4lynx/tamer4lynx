import React from 'react';
import { Box, Text } from 'ink';

export type StatusVariant = 'success' | 'error' | 'warning' | 'info';

export type StatusBoxProps = {
  variant: StatusVariant;
  children: React.ReactNode;
  title?: string;
};

const colors: Record<StatusVariant, string> = {
  success: 'green',
  error: 'red',
  warning: 'yellow',
  info: 'cyan',
};

export function StatusBox({ variant, children, title }: StatusBoxProps) {
  const c = colors[variant];
  return (
    <Box flexDirection="column" borderStyle="round" borderColor={c} paddingX={1}>
      {title ? (
        <Text bold color={c}>
          {title}
        </Text>
      ) : null}
      <Box flexDirection="column">{children}</Box>
    </Box>
  );
}
