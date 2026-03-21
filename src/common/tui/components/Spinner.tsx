import React from 'react';
import { Text } from 'ink';
import InkSpinner from 'ink-spinner';

export type TuiSpinnerProps = {
  label?: string;
  type?: 'dots' | 'line' | 'pipe' | 'simpleDots' | 'star' | 'flip' | 'bouncingBar' | 'bouncingBall';
};

export function TuiSpinner({ label, type = 'dots' }: TuiSpinnerProps) {
  return (
    <Text color="cyan">
      <InkSpinner type={type} />{label ? ` ${label}` : ''}
    </Text>
  );
}
