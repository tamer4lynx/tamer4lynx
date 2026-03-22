import React from 'react';
import { render } from 'ink';
import { TuiSelectInput, type SelectItem } from './tui';

export async function pickOne<T extends string>(label: string, items: SelectItem<T>[]): Promise<T> {
  return new Promise((resolve) => {
    let inst: ReturnType<typeof render>;
    const App = () => (
      <TuiSelectInput
        label={label}
        items={items}
        onSelect={(value) => {
          inst.unmount();
          resolve(value);
        }}
      />
    );
    inst = render(<App />);
  });
}

export function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}
