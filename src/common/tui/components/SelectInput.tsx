import React from 'react';
import { Box, Text } from 'ink';
import InkSelectInput from 'ink-select-input';

export type SelectItem<T extends string = string> = { label: string; value: T };

export type TuiSelectInputProps<T extends string = string> = {
  label?: string;
  items: SelectItem<T>[];
  onSelect: (value: T) => void;
  hint?: string;
};

export function TuiSelectInput<T extends string = string>({
  label,
  items,
  onSelect,
  hint,
}: TuiSelectInputProps<T>) {
  return (
    <Box flexDirection="column">
      {label ? <Text>{label}</Text> : null}
      <InkSelectInput
        items={items}
        onSelect={(item) => onSelect(item.value as T)}
      />
      {hint ? <Text dimColor>{hint}</Text> : null}
    </Box>
  );
}
