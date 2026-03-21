import React from 'react';
import { Box, Text } from 'ink';
import InkTextInput from 'ink-text-input';

export type TuiPasswordInputProps = {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  hint?: string;
  error?: string;
  mask?: string;
};

export function TuiPasswordInput({
  label,
  value,
  onChange,
  onSubmit,
  hint,
  error,
  mask = '*',
}: TuiPasswordInputProps) {
  return (
    <Box flexDirection="column">
      {label ? <Text>{label}</Text> : null}
      <InkTextInput
        value={value}
        onChange={onChange}
        onSubmit={onSubmit}
        mask={mask}
      />
      {error ? (
        <Text color="red">{error}</Text>
      ) : hint ? (
        <Text dimColor>{hint}</Text>
      ) : null}
    </Box>
  );
}
