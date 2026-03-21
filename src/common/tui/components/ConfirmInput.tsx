import React from 'react';
import { Box, Text } from 'ink';
import { TuiSelectInput, type SelectItem } from './SelectInput';

export type TuiConfirmInputProps = {
  label?: string;
  onConfirm: (yes: boolean) => void;
  defaultYes?: boolean;
  hint?: string;
};

export function TuiConfirmInput({
  label,
  onConfirm,
  defaultYes = false,
  hint,
}: TuiConfirmInputProps) {
  const items: SelectItem[] = defaultYes
    ? [
        { label: 'Yes (default)', value: 'yes' },
        { label: 'No', value: 'no' },
      ]
    : [
        { label: 'No (default)', value: 'no' },
        { label: 'Yes', value: 'yes' },
      ];
  return (
    <Box flexDirection="column">
      {label ? <Text>{label}</Text> : null}
      <TuiSelectInput
        items={items}
        onSelect={(v) => onConfirm(v === 'yes')}
        hint={hint}
      />
    </Box>
  );
}
