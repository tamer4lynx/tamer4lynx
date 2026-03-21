import { useState, useCallback } from 'react';

export function useInputState(initial: string) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | undefined>();
  const reset = useCallback(() => {
    setValue(initial);
    setError(undefined);
  }, [initial]);
  return { value, setValue, error, setError, reset };
}
