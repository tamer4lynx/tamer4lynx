import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import InkTextInput from 'ink-text-input';

export type TuiTextInputProps = {
  label?: string;
  /** Controlled value (if set, `defaultValue` is ignored). */
  value?: string;
  /** Uncontrolled initial value; internal state updates until submit. */
  defaultValue?: string;
  onChange?: (v: string) => void;
  /** Called when Enter is pressed. Return `false` to skip `onSubmit` (e.g. validation failed). */
  onSubmitValue?: (v: string) => void | boolean;
  onSubmit: () => void;
  hint?: string;
  error?: string;
};

export function TuiTextInput({
  label,
  value: valueProp,
  defaultValue = '',
  onChange: onChangeProp,
  onSubmitValue,
  onSubmit,
  hint,
  error,
}: TuiTextInputProps) {
  const controlled = valueProp !== undefined;
  const [internal, setInternal] = useState(defaultValue);
  useEffect(() => {
    if (!controlled) setInternal(defaultValue);
  }, [defaultValue, controlled]);

  const value = controlled ? valueProp! : internal;
  const onChange = (v: string) => {
    if (!controlled) setInternal(v);
    onChangeProp?.(v);
  };

  return (
    <Box flexDirection="column">
      {label ? <Text>{label}</Text> : null}
      <InkTextInput
        value={value}
        onChange={onChange}
        onSubmit={() => {
          const r = onSubmitValue?.(value);
          if (r === false) return;
          onSubmit();
        }}
      />
      {error ? (
        <Text color="red">{error}</Text>
      ) : hint ? (
        <Text dimColor>{hint}</Text>
      ) : null}
    </Box>
  );
}
