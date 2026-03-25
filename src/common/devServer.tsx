import React, { useState, useEffect, useRef, useCallback } from 'react';
import { spawn } from 'child_process';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { render, useInput, useApp } from 'ink';
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

function sendFileFromDisk(res: http.ServerResponse, absPath: string) {
  fs.readFile(absPath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(absPath).toLowerCase();
    res.setHeader('Content-Type', STATIC_MIME[ext] ?? 'application/octet-stream');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.end(data);
  });
}

function isPortInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = http.createServer();
    server.once('error', (err: NodeJS.ErrnoException) => {
      resolve(err.code === 'EADDRINUSE');
    });
    server.once('listening', () => {
      server.close(() => resolve(false));
    });
    server.listen(port, '127.0.0.1');
  });
}

async function findAvailablePort(preferred: number, maxAttempts = 10): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = preferred + i;
    if (!(await isPortInUse(port))) return port;
  }
  throw new Error(`No available port in range ${preferred}-${preferred + maxAttempts - 1}`);
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
};

const initialUi = (): DevUiState => ({
  phase: 'starting',
  projectName: '',
  port: 0,
  lanIp: 'localhost',
  devUrl: '',
  wsUrl: '',
  lynxBundleFile: 'main.lynx.bundle',
  bonjour: false,
  verbose: false,
  buildPhase: 'idle',
  wsConnections: 0,
  logLines: [],
  qrLines: [],
});

function DevServerApp({ verbose }: { verbose: boolean }) {
  const { exit } = useApp();
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
    void cleanupRef.current?.();
    exit();
  }, [exit]);

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      handleQuit();
      return;
    }
    if (input === 'q') {
      handleQuit();
      return;
    }
    if (input === 'r') {
      void rebuildRef.current();
      return;
    }
    if (input === 'c') {
      setUi((s) => ({ ...s, logLines: [] }));
      return;
    }
  });

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
        const port = await findAvailablePort(preferredPort);
        if (port !== preferredPort) {
          appendLog(`Port ${preferredPort} in use, using ${port}`);
        }

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
          if (reqPath === `${basePath}/status`) {
            res.setHeader('Content-Type', 'text/plain');
            res.setHeader('Access-Control-Allow-Origin', '*');
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
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Access-Control-Allow-Origin', '*');
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
              res.setHeader('Content-Type', STATIC_MIME[iconExt] ?? 'image/png');
              res.setHeader('Access-Control-Allow-Origin', '*');
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
            sendFileFromDisk(res, abs);
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
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Content-Type', reqPath.endsWith('.bundle') ? 'application/octet-stream' : 'application/javascript');
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
            w.on('change', () => {
              watchRebuild.schedule();
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

        await new Promise<void>((listenResolve, listenReject) => {
          httpSrv.listen(port, '0.0.0.0', () => {
            listenResolve();
          });
          httpSrv.once('error', (err) => listenReject(err));
        });

        if (!alive) return;

        void import('dnssd-advertise')
          .then(({ advertise }) => {
            stopBonjour = advertise({
              name: projectName,
              type: 'tamer',
              protocol: 'tcp',
              port,
              txt: {
                name: projectName.slice(0, 255),
                path: basePath.slice(0, 255),
              },
            });
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
          lanIp,
          devUrl,
          wsUrl,
        }));

        void import('qrcode-terminal')
          .then((mod) => {
            const qrcode = mod.default ?? mod;
            qrcode.generate(devUrl, { small: true }, (qr: string) => {
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
    <ServerDashboard
      cliVersion={TAMER_CLI_VERSION}
      projectName={ui.projectName}
      port={ui.port}
      lanIp={ui.lanIp}
      devUrl={ui.devUrl}
      wsUrl={ui.wsUrl}
      lynxBundleFile={ui.lynxBundleFile}
      bonjour={ui.bonjour}
      verbose={ui.verbose}
      buildPhase={ui.buildPhase}
      buildError={ui.buildError}
      wsConnections={ui.wsConnections}
      logLines={ui.logLines}
      qrLines={ui.qrLines}
      phase={ui.phase}
      startError={ui.startError}
    />
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
