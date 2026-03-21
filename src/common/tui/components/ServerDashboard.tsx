import React from 'react';
import { Box, Text } from 'ink';
import { TuiSpinner } from './Spinner';

const LOG_DISPLAY_MAX = 120;

export type BuildPhase = 'idle' | 'building' | 'success' | 'error';

export type ServerDashboardProps = {
  cliVersion: string;
  projectName: string;
  port: number;
  lanIp: string;
  devUrl: string;
  wsUrl: string;
  lynxBundleFile: string;
  bonjour: boolean;
  verbose: boolean;
  buildPhase: BuildPhase;
  buildError?: string;
  wsConnections: number;
  logLines: string[];
  qrLines: string[];
  phase: 'starting' | 'running' | 'failed';
  startError?: string;
};

export function ServerDashboard({
  cliVersion,
  projectName,
  port,
  lanIp,
  devUrl,
  wsUrl,
  lynxBundleFile,
  bonjour,
  verbose,
  buildPhase,
  buildError,
  wsConnections,
  logLines,
  qrLines,
  phase,
  startError,
}: ServerDashboardProps) {
  if (phase === 'failed') {
    return (
      <Box flexDirection="column">
        <Text color="red" bold>
          Dev server failed to start
        </Text>
        {startError ? <Text color="red">{startError}</Text> : null}
        <Box marginTop={1}>
          <Text dimColor>Press Ctrl+C or 'q' to quit</Text>
        </Box>
      </Box>
    );
  }

  const bundlePath = `${devUrl}/${lynxBundleFile}`;

  return (
    <Box flexDirection="column">
      <Text bold color="green">
        Tamer4Lynx dev server ({projectName})
      </Text>
      <Text dimColor>
        t4l v{cliVersion}
      </Text>
      {verbose ? <Text dimColor>Logs: verbose (native + JS)</Text> : null}
      <Box marginTop={1} flexDirection="row" columnGap={3} alignItems="flex-start">
        {qrLines.length > 0 ? (
          <Box flexDirection="column" flexShrink={0}>
            <Text bold>Scan</Text>
            {qrLines.map((line, i) => (
              <Text key={i}>{line}</Text>
            ))}
            <Box marginTop={1} flexDirection="column">
              <Text bold>Open</Text>
              <Text color="cyan" wrap="truncate-end">
                {devUrl}
              </Text>
            </Box>
          </Box>
        ) : (
          <Box flexDirection="column" flexShrink={0}>
            <Text bold>Open</Text>
            <Text color="cyan" wrap="truncate-end">
              {devUrl}
            </Text>
          </Box>
        )}
        <Box
          flexDirection="column"
          flexGrow={1}
          minWidth={28}
          marginTop={qrLines.length > 0 ? 2 : 0}
        >
          <Text>
            Port: <Text color="cyan">{port}</Text> · LAN: <Text color="cyan">{lanIp}</Text>
          </Text>
          <Text dimColor wrap="truncate-end">
            {bundlePath}
          </Text>
          <Text dimColor wrap="truncate-end">
            {devUrl}/meta.json
          </Text>
          <Text dimColor wrap="truncate-end">
            {wsUrl}
          </Text>
          {bonjour ? <Text dimColor>mDNS: _tamer._tcp</Text> : null}
          <Box marginTop={1} flexDirection="column">
            <Text bold>Build</Text>
            {buildPhase === 'building' ? (
              <TuiSpinner label="building…" />
            ) : buildPhase === 'error' ? (
              <Text color="red">{buildError ?? 'Build failed'}</Text>
            ) : buildPhase === 'success' ? (
              <Text color="green">Lynx bundle ready</Text>
            ) : (
              <Text dimColor>—</Text>
            )}
          </Box>
          <Box marginTop={1} flexDirection="column">
            <Text bold>Connections</Text>
            <Text dimColor>WebSocket clients: {wsConnections}</Text>
          </Box>
        </Box>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>r rebuild · c clear output · Ctrl+C or q quit</Text>
      </Box>
      {logLines.length > 0 ? (
        <Box marginTop={1} flexDirection="column">
          {logLines.length > LOG_DISPLAY_MAX ? (
            <Text dimColor>… {logLines.length - LOG_DISPLAY_MAX} earlier lines omitted</Text>
          ) : null}
          {logLines.slice(-LOG_DISPLAY_MAX).map((line, i) => (
            <Text key={i}>{line}</Text>
          ))}
        </Box>
      ) : null}
    </Box>
  );
}
