import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

export type MultiSelectItem<T extends string = string> = {
  label: string;
  value: T;
  selected?: boolean;
};

export type TuiMultiSelectInputProps<T extends string = string> = {
  label?: string;
  items: MultiSelectItem<T>[];
  onSubmit: (values: T[]) => void;
  hint?: string;
};

export function TuiMultiSelectInput<T extends string = string>({
  label,
  items,
  onSubmit,
  hint,
}: TuiMultiSelectInputProps<T>) {
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<Set<T>>(
    () => new Set(items.filter((item) => item.selected).map((item) => item.value)),
  );

  useInput((input, key) => {
    if (key.upArrow) {
      setCursor((c) => (c <= 0 ? items.length - 1 : c - 1));
      return;
    }
    if (key.downArrow) {
      setCursor((c) => (c >= items.length - 1 ? 0 : c + 1));
      return;
    }
    if (input === ' ') {
      const item = items[cursor];
      if (!item) return;
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(item.value)) next.delete(item.value);
        else next.add(item.value);
        return next;
      });
      return;
    }
    if (key.return) {
      onSubmit(items.filter((item) => selected.has(item.value)).map((item) => item.value));
    }
  });

  return (
    <Box flexDirection="column">
      {label ? <Text>{label}</Text> : null}
      {items.map((item, index) => {
        const active = index === cursor;
        const checked = selected.has(item.value);
        return (
          <Text key={item.value} color={active ? 'cyan' : undefined}>
            {active ? '›' : ' '} [{checked ? 'x' : ' '}] {item.label}
          </Text>
        );
      })}
      {hint ? <Text dimColor>{hint}</Text> : null}
    </Box>
  );
}
