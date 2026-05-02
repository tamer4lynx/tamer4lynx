import { useCallback, useState } from '@lynx-js/react';
import { Button, Card, px } from '@tamer4lynx/tamer-app-shell';

import { pageShellStyle, useExamplePalette } from '../../examplePalette.js';

const JSON_PLACEHOLDER = 'https://jsonplaceholder.typicode.com/todos/1';
const WS_ECHO = 'wss://echo.websocket.org';
const SSE_WIKI = 'https://stream.wikimedia.org/v2/stream/recentchange';

async function responseToJson(r: Response): Promise<unknown> {
  if (typeof r.json === 'function') {
    return r.json();
  }
  return JSON.parse(await r.text());
}

export default function TransportsPage() {
  const p = useExamplePalette();
  const [fetchLog, setFetchLog] = useState('');
  const [wsLog, setWsLog] = useState('');
  const [sseLog, setSseLog] = useState('');

  const runFetch = useCallback(() => {
    'background only';
    setFetchLog('Loading…');
    void (async () => {
      try {
        const f = globalThis.fetch;
        if (typeof f !== 'function') {
          setFetchLog('Error: fetch is not available');
          return;
        }
        const r = await f(JSON_PLACEHOLDER);
        const data = await responseToJson(r);
        setFetchLog(`OK: ${JSON.stringify(data).slice(0, 280)}`);
      } catch (e: unknown) {
        setFetchLog(`Error: ${e instanceof Error ? e.message : String(e)}`);
      }
    })();
  }, []);

  const runWs = useCallback(() => {
    'background only';
    const Ctor = globalThis.WebSocket;
    if (typeof Ctor !== 'function') {
      setWsLog(
        'WebSocket is not available yet (polyfill loads shortly after startup).',
      );
      return;
    }
    setWsLog('Connecting…');
    const ws = new Ctor(WS_ECHO);
    const t = setTimeout(() => {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      setWsLog((prev) =>
        prev.startsWith('Echo:') ? prev : 'Timeout waiting for echo',
      );
    }, 8000);
    ws.onopen = () => {
      ws.send('tamer-transports ping');
    };
    ws.onmessage = (ev) => {
      clearTimeout(t);
      setWsLog(`Echo: ${String(ev.data).slice(0, 240)}`);
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    };
    ws.onerror = () => {
      clearTimeout(t);
      setWsLog('WebSocket error');
    };
  }, []);

  const runSse = useCallback(() => {
    'background only';
    const Ctor = globalThis.EventSource;
    if (typeof Ctor !== 'function') {
      setSseLog('EventSource is not available');
      return;
    }
    setSseLog('Connecting…');
    const es = new Ctor(SSE_WIKI);
    let done = false;
    const t = setTimeout(() => {
      if (done) return;
      done = true;
      try {
        es.close();
      } catch {
        /* ignore */
      }
      setSseLog((prev) =>
        prev.startsWith('SSE:') ? prev : 'Timeout (no message)',
      );
    }, 12000);
    es.onmessage = (ev) => {
      if (done) return;
      done = true;
      clearTimeout(t);
      setSseLog(`SSE: ${String(ev.data).slice(0, 240)}`);
      try {
        es.close();
      } catch {
        /* ignore */
      }
    };
    es.onerror = () => {
      if (done) return;
      done = true;
      clearTimeout(t);
      setSseLog('EventSource error or closed');
      try {
        es.close();
      } catch {
        /* ignore */
      }
    };
  }, []);

  return (
    <scroll-view scroll-y style={{ ...pageShellStyle(p.surface), flex: 1 }}>
      <view
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: px(20),
          padding: px(32),
          paddingBottom: px(48),
        }}
      >
        <text style={{ fontSize: px(14), color: p.onSurfaceVariant }}>
          Uses global fetch / WebSocket / EventSource after polyfills from
          @tamer4lynx/tamer-transports/lynx (entry import). Avoid importing the
          package here so the bundle does not load a second copy of its index.
        </text>

        <Card variant="outlined">
          <view
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: px(14),
            }}
          >
            <Button
              label={`fetch GET\n${JSON_PLACEHOLDER}`}
              onTap={runFetch}
              variant="filled"
              size="sm"
              style={{
                width: '100%',
                alignSelf: 'stretch',
                minHeight: px(80),
                height: 'auto',
              }}
            />
            <view style={{ width: '100%', minHeight: px(8) }}>
              {fetchLog ? (
                <text
                  style={{
                    fontSize: px(14),
                    color: p.onSurfaceVariant,
                    wordBreak: 'break-all',
                    lineHeight: px(20),
                  }}
                >
                  {fetchLog}
                </text>
              ) : null}
            </view>
          </view>
        </Card>

        <Card variant="outlined">
          <view
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: px(14),
            }}
          >
            <Button
              label={`WebSocket echo\n${WS_ECHO}`}
              onTap={runWs}
              variant="filled"
              size="sm"
              style={{
                width: '100%',
                alignSelf: 'stretch',
                minHeight: px(80),
                height: 'auto',
              }}
            />
            <view style={{ width: '100%', minHeight: px(8) }}>
              {wsLog ? (
                <text
                  style={{
                    fontSize: px(14),
                    color: p.onSurfaceVariant,
                    wordBreak: 'break-all',
                    lineHeight: px(20),
                  }}
                >
                  {wsLog}
                </text>
              ) : null}
            </view>
          </view>
        </Card>

        <Card variant="outlined">
          <view
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              gap: px(14),
            }}
          >
            <Button
              label={`EventSource (SSE)\n${SSE_WIKI}`}
              onTap={runSse}
              variant="filled"
              size="sm"
              style={{
                width: '100%',
                alignSelf: 'stretch',
                minHeight: px(96),
                height: 'auto',
              }}
            />
            <view style={{ width: '100%', minHeight: px(8) }}>
              {sseLog ? (
                <text
                  style={{
                    fontSize: px(14),
                    color: p.onSurfaceVariant,
                    wordBreak: 'break-all',
                    lineHeight: px(20),
                  }}
                >
                  {sseLog}
                </text>
              ) : null}
            </view>
          </view>
        </Card>
      </view>
    </scroll-view>
  );
}
