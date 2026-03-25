export function createDebouncedSerialRebuild(
  run: () => Promise<void>,
  debounceMs: number,
): { schedule: () => void; cancel: () => void } {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let chain: Promise<void> = Promise.resolve();

  const schedule = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      chain = chain
        .catch(() => {})
        .then(() => run().catch(() => {}));
    }, debounceMs);
  };

  const cancel = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
  };

  return { schedule, cancel };
}

export const WATCH_REBUILD_DEBOUNCE_MS = 400;
