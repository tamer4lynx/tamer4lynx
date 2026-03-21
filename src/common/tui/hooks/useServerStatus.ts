import { useState, useCallback } from 'react';

export type BuildPhase = 'idle' | 'building' | 'success' | 'error';

export function useServerStatus() {
  const [buildPhase, setBuildPhase] = useState<BuildPhase>('idle');
  const [buildError, setBuildError] = useState<string | undefined>();
  const [wsConnections, setWsConnections] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const appendLog = useCallback((line: string) => {
    setLogs((prev) => [...prev.slice(-300), line]);
  }, []);

  const clearLogs = useCallback(() => setLogs([]), []);

  return {
    buildPhase,
    setBuildPhase,
    buildError,
    setBuildError,
    wsConnections,
    setWsConnections,
    logs,
    appendLog,
    clearLogs,
  };
}
