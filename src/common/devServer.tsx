import React, { useState, useEffect, useRef, useCallback } from 'react';
import { spawn } from 'child_process';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { render, useInput, useApp, useStdin } from 'ink';
import { WebSocket, WebSocketServer } from 'ws';
import { discoverNativeExtensions } from './config';
import { resolveHostPaths, resolveIconPaths } from './hostConfig';
import { getCliVersion } from './cliVersion';
import { ServerDashboard } from './tui/components/ServerDashboard';
import type { BuildPhase } from './tui/hooks/useServerStatus';
import { createDebouncedSerialRebuild, WATCH_REBUILD_DEBOUNCE_MS } from './watchRebuild';

const DEFAULT_PORT = 3000;
const TAMER_CLI_VERSION = getCliVersion();
const MAX_LOG_LINES = 800;

const STATIC_MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
};

function contentTypeForDevPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.bundle') return 'application/octet-stream';
  if (ext === '.js' || ext === '.mjs') return 'application/javascript';
  if (ext === '.json') return 'application/json';
  if (ext === '.css') return 'text/css';
  if (ext === '.html') return 'text/html; charset=utf-8';
  return STATIC_MIME[ext] ?? 'application/octet-stream';
}

function sendFileFromDisk(res: http.ServerResponse, absPath: string, req?: http.IncomingMessage) {
  fs.stat(absPath, (statErr, stats) => {
    if (statErr) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const mtime = stats.mtime;
    const etag = `"${stats.mtimeMs.toString(16)}-${stats.size.toString(16)}"`;
    const lastModified = mtime.toUTCString();

    // Conditional GET support for asset caching (used by TamerAssetsModule)
    if (req) {
      const ifNoneMatch = req.headers['if-none-match'];
      const ifModifiedSince = req.headers['if-modified-since'];
      if (ifNoneMatch && ifNoneMatch === etag) {
        res.writeHead(304);
        res.end();
        return;
      }
      if (!ifNoneMatch && ifModifiedSince) {
        const clientDate = new Date(ifModifiedSince);
        if (!isNaN(clientDate.getTime()) && mtime <= clientDate) {
          res.writeHead(304);
          res.end();
          return;
        }
      }
    }

    fs.readFile(absPath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      setAssetHeaders(res, contentTypeForDevPath(absPath), etag, lastModified);
      res.end(data);
    });
  });
}

function setDevHeaders(res: http.ServerResponse, contentType?: string) {
  if (contentType) res.setHeader('Content-Type', contentType);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
}

function setAssetHeaders(res: http.ServerResponse, contentType: string, etag: string, lastModified: string) {
  res.setHeader('Content-Type', contentType);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('ETag', etag);
  res.setHeader('Last-Modified', lastModified);
  // Allow conditional GETs but revalidate every time (no stale serving without server check)
  res.setHeader('Cache-Control', 'no-cache');
}

function listenOnPort(server: http.Server, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      server.off('error', onError);
      server.off('listening', onListening);
    };
    const onError = (err: NodeJS.ErrnoException) => {
      cleanup();
      reject(err);
    };
    const onListening = () => {
      cleanup();
      resolve();
    };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, '0.0.0.0');
  });
}

async function listenOnAvailablePort(server: http.Server, preferred: number, maxAttempts = 20): Promise<number> {
  let lastError: unknown;
  for (let i = 0; i < maxAttempts; i++) {
    const port = preferred + i;
    try {
      await listenOnPort(server, port);
      return port;
    } catch (err) {
      lastError = err;
      if ((err as NodeJS.ErrnoException).code !== 'EADDRINUSE') throw err;
    }
  }
  const end = preferred + maxAttempts - 1;
  const suffix = lastError instanceof Error && lastError.message ? `: ${lastError.message}` : '';
  throw new Error(`No available port in range ${preferred}-${end}${suffix}`);
}

function getLanIp(): string {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    const addrs = nets[name];
    if (!addrs) continue;
    for (const a of addrs) {
      if (a.family === 'IPv4' && !a.internal) return a.address;
    }
  }
  return 'localhost';
}

function detectPackageManager(cwd: string): { cmd: string; args: string[] } {
  const dir = path.resolve(cwd);
  if (fs.existsSync(path.join(dir, 'pnpm-lock.yaml'))) return { cmd: 'pnpm', args: ['run', 'build'] };
  if (fs.existsSync(path.join(dir, 'bun.lockb')) || fs.existsSync(path.join(dir, 'bun.lock')))
    return { cmd: 'bun', args: ['run', 'build'] };
  return { cmd: 'npm', args: ['run', 'build'] };
}

type DevUiState = {
  phase: 'starting' | 'running' | 'failed';
  startError?: string;
  projectName: string;
  port: number;
  preferredPort: number;
  lanIp: string;
  devUrl: string;
  wsUrl: string;
  lynxBundleFile: string;
  bonjour: boolean;
  verbose: boolean;
  buildPhase: BuildPhase;
  buildError?: string;
  wsConnections: number;
  statusProbeCount: number;
  metaProbeCount: number;
  logLines: string[];
  qrLines: string[];
};

const initialUi = (): DevUiState => ({
  phase: 'starting',
  projectName: '',
  port: 0,
  preferredPort: DEFAULT_PORT,
  lanIp: 'localhost',
  devUrl: '',
  wsUrl: '',
  lynxBundleFile: 'main.lynx.bundle',
  bonjour: false,
  verbose: false,
  buildPhase: 'idle',
  wsConnections: 0,
  statusProbeCount: 0,
  metaProbeCount: 0,
  logLines: [],
  qrLines: [],
});

function probeKindFromRequest(req: http.IncomingMessage, reqPath: string): 'status' | 'meta' | null {
  const probeHeader = req.headers['x-tamer-probe']
  const probeValue = Array.isArray(probeHeader) ? probeHeader[0] : probeHeader
  if (typeof probeValue !== 'string' || probeValue.trim() === '') return null
  if (reqPath.endsWith('/status') || reqPath === '/status') return 'status'
  if (reqPath.endsWith('/meta.json') || reqPath === '/meta.json') return 'meta'
  return null
}

function DevServerKeyboard({
  onQuit,
  onRebuild,
  onClear,
}: {
  onQuit: () => void;
  onRebuild: () => void;
  onClear: () => void;
}) {
  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      onQuit();
      return;
    }
    if (input === 'q') {
      onQuit();
      return;
    }
    if (input === 'r') {
      onRebuild();
      return;
    }
    if (input === 'c') {
      onClear();
      return;
    }
  });
  return null;
}

function DevServerApp({ verbose }: { verbose: boolean }) {
  const { exit } = useApp();
  const { isRawModeSupported } = useStdin();
  const [ui, setUi] = useState<DevUiState>(() => {
    const s = initialUi();
    s.verbose = verbose;
    return s;
  });

  const cleanupRef = useRef<(() => Promise<void>) | null>(null);
  const rebuildRef = useRef<() => Promise<void>>(() => Promise.resolve());
  const quitOnceRef = useRef(false);
  const appendLogLine = useCallback((line: string) => {
    setUi((prev) => ({
      ...prev,
      logLines: [...prev.logLines, line].slice(-MAX_LOG_LINES),
    }));
  }, []);

  const appendLog = useCallback(
    (chunk: string) => {
      for (const line of chunk.split(/\r?\n/)) {
        appendLogLine(line);
      }
    },
    [appendLogLine],
  );

  const handleQuit = useCallback(() => {
    if (quitOnceRef.current) return;
    quitOnceRef.current = true;
    void (cleanupRef.current?.() ?? Promise.resolve()).then(() => exit(), () => exit());
  }, [exit]);

  useEffect(() => {
    const onSig = () => {
      handleQuit();
    };
    process.on('SIGINT', onSig);
    process.on('SIGTERM', onSig);
    return () => {
      process.off('SIGINT', onSig);
      process.off('SIGTERM', onSig);
    };
  }, [handleQuit]);

  useEffect(() => {
    let alive = true;
    let buildProcess: ReturnType<typeof spawn> | null = null;
    let watcher: { close: () => Promise<void> } | null = null;
    let stopBonjour: (() => Promise<void>) | undefined;

    const run = async () => {
      try {
        const resolved = resolveHostPaths();
        const { projectRoot, lynxProjectDir, lynxBundlePath, lynxBundleFile, config } = resolved;
        const distDir = path.dirname(lynxBundlePath);
        const projectName = path.basename(lynxProjectDir);
        const basePath = `/${projectName}`;

        setUi((s) => ({ ...s, projectName, lynxBundleFile }));

        const preferredPort = config.devServer?.port ?? config.devServer?.httpPort ?? DEFAULT_PORT;
        let port = preferredPort;

        const iconPaths = resolveIconPaths(projectRoot, config);
        let iconFilePath: string | null = null;
        if (iconPaths?.source && fs.statSync(iconPaths.source).isFile()) {
          iconFilePath = iconPaths.source;
        } else if (iconPaths?.androidAdaptiveForeground && fs.statSync(iconPaths.androidAdaptiveForeground).isFile()) {
          iconFilePath = iconPaths.androidAdaptiveForeground;
        } else if (iconPaths?.android) {
          const androidIcon = path.join(iconPaths.android, 'mipmap-xxxhdpi', 'ic_launcher.png');
          if (fs.existsSync(androidIcon)) iconFilePath = androidIcon;
        } else if (iconPaths?.ios) {
          const iosIcon = path.join(iconPaths.ios, 'Icon-1024.png');
          if (fs.existsSync(iosIcon)) iconFilePath = iosIcon;
        }
        const iconExt = iconFilePath ? path.extname(iconFilePath) || '.png' : '';

        const runBuild = (): Promise<void> => {
          return new Promise((resolve, reject) => {
            const { cmd, args } = detectPackageManager(lynxProjectDir);
            buildProcess = spawn(cmd, args, {
              cwd: lynxProjectDir,
              stdio: 'pipe',
              shell: process.platform === 'win32',
            });
            let stderrRaw = '';
            buildProcess.stdout?.resume();
            buildProcess.stderr?.on('data', (d) => {
              stderrRaw += d.toString();
            });
            buildProcess.on('close', (code) => {
              buildProcess = null;
              if (code === 0) resolve();
              else reject(new Error(stderrRaw.trim() || `Build exited ${code}`));
            });
          });
        };

        const doBuild = async () => {
          setUi((s) => ({ ...s, buildPhase: 'building', buildError: undefined }));
          try {
            await runBuild();
            if (!alive) return;
            setUi((s) => ({ ...s, buildPhase: 'success' }));
          } catch (e) {
            if (!alive) return;
            const msg = (e as Error).message;
            setUi((s) => ({ ...s, buildPhase: 'error', buildError: msg }));
            throw e;
          }
        };

        const httpSrv = http.createServer((req, res) => {
          let reqPath = (req.url || '/').split('?')[0];
          const probeKind = probeKindFromRequest(req, reqPath)
          if (probeKind === 'status') {
            setUi((s) => ({ ...s, statusProbeCount: s.statusProbeCount + 1 }))
          } else if (probeKind === 'meta') {
            setUi((s) => ({ ...s, metaProbeCount: s.metaProbeCount + 1 }))
          }
          if (reqPath === `${basePath}/status`) {
            setDevHeaders(res, 'text/plain');
            res.end('packager-status:running');
            return;
          }
          if (reqPath === `${basePath}/meta.json`) {
            const lanIp = getLanIp();
            const nativeModules = discoverNativeExtensions(projectRoot);
            const androidPackageName = config.android?.packageName?.trim();
            const iosBundleId = config.ios?.bundleId?.trim();
            const idParts = [androidPackageName?.toLowerCase(), iosBundleId?.toLowerCase()].filter(
              (x): x is string => Boolean(x)
            );
            const meta: Record<string, unknown> = {
              name: projectName,
              slug: projectName,
              bundleUrl: `http://${lanIp}:${port}${basePath}/${lynxBundleFile}`,
              bundleFile: lynxBundleFile,
              hostUri: `http://${lanIp}:${port}${basePath}`,
              debuggerHost: `${lanIp}:${port}`,
              developer: { tool: 'tamer4lynx' },
              packagerStatus: 'running',
              nativeModules: nativeModules.map((m) => ({
                packageName: m.packageName,
                moduleClassName: m.moduleClassName,
              })),
            };
            if (androidPackageName) meta.androidPackageName = androidPackageName;
            if (iosBundleId) meta.iosBundleId = iosBundleId;
            if (idParts.length > 0) meta.tamerAppKey = idParts.join('|');
            const rawIcon = config.icon;
            if (rawIcon && typeof rawIcon === 'object' && 'source' in rawIcon && typeof (rawIcon as { source?: string }).source === 'string') {
              meta.iconSource = (rawIcon as { source: string }).source;
            } else if (typeof rawIcon === 'string') {
              meta.iconSource = rawIcon;
            }
            if (iconFilePath) {
              meta.icon = `http://${lanIp}:${port}${basePath}/icon${iconExt}`;
            }
            setDevHeaders(res, 'application/json');
            res.end(JSON.stringify(meta, null, 2));
            return;
          }
          if (iconFilePath && (reqPath === `${basePath}/icon` || reqPath === `${basePath}/icon${iconExt}`)) {
            fs.readFile(iconFilePath, (err, data) => {
              if (err) {
                res.writeHead(404);
                res.end();
                return;
              }
              setDevHeaders(res, STATIC_MIME[iconExt] ?? 'image/png');
              res.end(data);
            });
            return;
          }
          const lynxStaticMounts: { prefix: string; rootSub: string }[] = [
            { prefix: `${basePath}/src/assets/`, rootSub: 'src/assets' },
            { prefix: `${basePath}/assets/`, rootSub: 'assets' },
          ];
          for (const { prefix, rootSub } of lynxStaticMounts) {
            if (!reqPath.startsWith(prefix)) continue;
            let rel = reqPath.slice(prefix.length);
            try {
              rel = decodeURIComponent(rel);
            } catch {
              res.writeHead(400);
              res.end();
              return;
            }
            const safe = path.normalize(rel).replace(/^(\.\.(\/|\\|$))+/, '');
            if (path.isAbsolute(safe) || safe.startsWith('..')) {
              res.writeHead(403);
              res.end();
              return;
            }
            const allowedRoot = path.resolve(lynxProjectDir, rootSub);
            const abs = path.resolve(allowedRoot, safe);
            if (!abs.startsWith(allowedRoot + path.sep) && abs !== allowedRoot) {
              res.writeHead(403);
              res.end();
              return;
            }
            if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) {
              res.writeHead(404);
              res.end('Not found');
              return;
            }
            sendFileFromDisk(res, abs, req);
            return;
          }
          if (reqPath === '/' || reqPath === basePath || reqPath === `${basePath}/`) {
            reqPath = `${basePath}/${lynxBundleFile}`;
          } else if (!reqPath.startsWith(basePath)) {
            reqPath = basePath + (reqPath.startsWith('/') ? reqPath : '/' + reqPath);
          }
          const relPath = reqPath.replace(basePath, '').replace(/^\//, '') || lynxBundleFile;
          const filePath = path.resolve(distDir, relPath);
          const distResolved = path.resolve(distDir);
          if (!filePath.startsWith(distResolved + path.sep) && filePath !== distResolved) {
            res.writeHead(403);
            res.end();
            return;
          }
          fs.readFile(filePath, (err, data) => {
            if (err) {
              res.writeHead(404);
              res.end('Not found');
              return;
            }
            setDevHeaders(res, contentTypeForDevPath(filePath));
            res.end(data);
          });
        });

        const wssInst = new WebSocketServer({ noServer: true });

        const syncWsClientCount = () => {
          if (!alive) return;
          let n = 0;
          wssInst.clients.forEach((c) => {
            if (c.readyState === WebSocket.OPEN) n++;
          });
          setUi((s) => ({ ...s, wsConnections: n }));
        };

        rebuildRef.current = async () => {
          try {
            await doBuild();
            if (!alive) return;
            wssInst.clients.forEach((client) => {
              if (client.readyState === 1) client.send(JSON.stringify({ type: 'reload' }));
            });
            appendLog('Rebuilt, clients notified');
          } catch {
            /* error state already set */
          }
        };

        const watchRebuild = createDebouncedSerialRebuild(
          () => rebuildRef.current(),
          WATCH_REBUILD_DEBOUNCE_MS,
        );

        httpSrv.on('upgrade', (request, socket, head) => {
          const p = (request.url || '').split('?')[0];
          if (p === `${basePath}/__hmr` || p === '/__hmr' || p.endsWith('/__hmr')) {
            wssInst.handleUpgrade(request, socket, head, (ws) => wssInst.emit('connection', ws, request));
          } else {
            socket.destroy();
          }
        });

        wssInst.on('connection', (ws, req) => {
          const clientIp = req.socket.remoteAddress ?? 'unknown';
          appendLog(`[WS] connected: ${clientIp}`);
          ws.send(JSON.stringify({ type: 'connected' }));
          syncWsClientCount();
          ws.on('close', () => {
            appendLog(`[WS] disconnected: ${clientIp}`);
            queueMicrotask(() => syncWsClientCount());
          });
          ws.on('error', () => {
            queueMicrotask(() => syncWsClientCount());
          });
          ws.on('message', (data) => {
            try {
              const msg = JSON.parse(data.toString());
              if (msg?.type === 'console_log' && Array.isArray(msg.message)) {
                const skip = msg.message.includes('[rspeedy-dev-server]') || msg.message.includes('[HMR]');
                if (skip) return;
                const isJs = msg.tag === 'lynx-console' || msg.tag == null;
                if (!verbose && !isJs) return;
                appendLog(`${isJs ? '[APP]' : '[NATIVE]'} ${msg.message.join(' ')}`);
              }
            } catch {
              /* ignore */
            }
          });
        });

        let chokidar: typeof import('chokidar') | null = null;
        try {
          chokidar = await import('chokidar');
        } catch {
          /* optional */
        }
        if (chokidar) {
          const watchPaths = [
            path.join(lynxProjectDir, 'src'),
            path.join(lynxProjectDir, 'lynx.config.ts'),
            path.join(lynxProjectDir, 'lynx.config.js'),
          ].filter((p) => fs.existsSync(p));

          if (watchPaths.length > 0) {
            const w = chokidar.watch(watchPaths, {
              ignoreInitial: true,
              awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
            });
            w.on('all', (eventName) => {
              if (eventName === 'add' || eventName === 'change' || eventName === 'unlink') {
                watchRebuild.schedule();
              }
            });
            watcher = {
              close: async () => {
                watchRebuild.cancel();
                await w.close();
              },
            };
          }
        }

        await doBuild();
        if (!alive) return;

        port = await listenOnAvailablePort(httpSrv, preferredPort);
        if (port !== preferredPort) {
          appendLog(`Port ${preferredPort} was unavailable; using ${port} for this session.`);
        }

        if (!alive) return;

        void import('bonjour-service')
          .then(({ Bonjour }) => {
            const bonjour = new Bonjour();
            bonjour.publish({
              name: projectName,
              type: 'tamer',
              port,
              txt: {
                name: projectName.slice(0, 255),
                path: basePath.slice(0, 255),
              },
            });
            stopBonjour = async () => { bonjour.destroy(); };
            setUi((s) => ({ ...s, bonjour: true }));
          })
          .catch(() => {});

        const lanIp = getLanIp();
        const devUrl = `http://${lanIp}:${port}${basePath}`;
        const wsUrl = `ws://${lanIp}:${port}${basePath}/__hmr`;

        setUi((s) => ({
          ...s,
          phase: 'running',
          port,
          preferredPort,
          lanIp,
          devUrl,
          wsUrl,
        }));

        void import('qrcode-terminal')
          .then((mod) => {
            const qrcode = mod.default ?? mod;
            const deepLinkUrl = `tamerdevapp://${devUrl.replace(/^https?:\/\//, '')}`;
            qrcode.generate(deepLinkUrl, { small: true }, (qr: string) => {
              if (!alive) return;
              setUi((s) => ({ ...s, qrLines: qr.split('\n').filter(Boolean) }));
            });
          })
          .catch(() => {});

        cleanupRef.current = async () => {
          buildProcess?.kill();
          await watcher?.close().catch(() => {});
          await stopBonjour?.();
          httpSrv.close();
          wssInst.close();
        };
      } catch (e) {
        if (!alive) return;
        setUi((s) => ({
          ...s,
          phase: 'failed',
          startError: (e as Error).message,
        }));
      }
    };

    void run();

    return () => {
      alive = false;
      void cleanupRef.current?.();
    };
  }, [appendLog, appendLogLine, verbose]);

  return (
    <>
      {isRawModeSupported ? (
        <DevServerKeyboard
          onQuit={handleQuit}
          onRebuild={() => {
            void rebuildRef.current();
          }}
          onClear={() => setUi((s) => ({ ...s, logLines: [] }))}
        />
      ) : null}
      <ServerDashboard
        cliVersion={TAMER_CLI_VERSION}
        projectName={ui.projectName}
        port={ui.port}
        preferredPort={ui.preferredPort}
        lanIp={ui.lanIp}
        devUrl={ui.devUrl}
        wsUrl={ui.wsUrl}
        lynxBundleFile={ui.lynxBundleFile}
        bonjour={ui.bonjour}
        verbose={ui.verbose}
        buildPhase={ui.buildPhase}
        buildError={ui.buildError}
        wsConnections={ui.wsConnections}
        statusProbeCount={ui.statusProbeCount}
        metaProbeCount={ui.metaProbeCount}
        logLines={ui.logLines}
        qrLines={ui.qrLines}
        phase={ui.phase}
        startError={ui.startError}
      />
    </>
  );
}

async function startDevServer(opts?: { verbose?: boolean }) {
  const verbose = opts?.verbose ?? false;
  const { waitUntilExit } = render(<DevServerApp verbose={verbose} />, {
    exitOnCtrlC: false,
    patchConsole: false,
  });
  await waitUntilExit();
}

export default startDevServer;
