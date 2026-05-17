import { spawn } from 'child_process';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import readline from 'readline';
import { WebSocketServer } from 'ws';
import { discoverNativeExtensions } from './config';
import { resolveHostPaths, resolveIconPaths } from './hostConfig';
import { createDebouncedSerialRebuild, WATCH_REBUILD_DEBOUNCE_MS } from './watchRebuild';

const DEFAULT_PORT = 3000;

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
    setDevHeaders(res, STATIC_MIME[ext] ?? 'application/octet-stream');
    res.end(data);
  });
}

function setDevHeaders(res: http.ServerResponse, contentType?: string) {
  if (contentType) res.setHeader('Content-Type', contentType);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
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

function probeKindFromRequest(req: http.IncomingMessage, reqPath: string): 'status' | 'meta' | null {
  const probeHeader = req.headers['x-tamer-probe'];
  const probeValue = Array.isArray(probeHeader) ? probeHeader[0] : probeHeader;
  if (typeof probeValue !== 'string' || probeValue.trim() === '') return null;
  if (reqPath.endsWith('/status') || reqPath === '/status') return 'status';
  if (reqPath.endsWith('/meta.json') || reqPath === '/meta.json') return 'meta';
  return null;
}

async function startDevServer(opts?: { verbose?: boolean }) {
  const verbose = opts?.verbose ?? false;
  const resolved = resolveHostPaths();
  const { projectRoot, lynxProjectDir, lynxBundlePath, lynxBundleFile, lynxBundleFiles, config } = resolved;
  const distDir = path.dirname(lynxBundlePath);

  let buildProcess: ReturnType<typeof spawn> | null = null;

  function detectPackageManager(cwd: string): { cmd: string; args: string[] } {
    const dir = path.resolve(cwd);
    if (fs.existsSync(path.join(dir, 'pnpm-lock.yaml'))) return { cmd: 'pnpm', args: ['run', 'build'] };
    if (fs.existsSync(path.join(dir, 'bun.lockb')) || fs.existsSync(path.join(dir, 'bun.lock'))) return { cmd: 'bun', args: ['run', 'build'] };
    return { cmd: 'npm', args: ['run', 'build'] };
  }

  function runBuild(): Promise<void> {
    return new Promise((resolve, reject) => {
      const { cmd, args } = detectPackageManager(lynxProjectDir);
      buildProcess = spawn(cmd, args, {
        cwd: lynxProjectDir,
        stdio: 'pipe',
        shell: process.platform === 'win32',
      });
      let stderr = '';
      buildProcess.stderr?.on('data', (d) => { stderr += d.toString(); });
      buildProcess.on('close', (code) => {
        buildProcess = null;
        if (code === 0) resolve();
        else reject(new Error(stderr || `Build exited ${code}`));
      });
    });
  }

  const preferredPort = config.devServer?.port ?? config.devServer?.httpPort ?? DEFAULT_PORT;
  let port = preferredPort;

  const projectName = path.basename(lynxProjectDir);
  const basePath = `/${projectName}`;
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
  let statusProbeCount = 0;
  let metaProbeCount = 0;
  const logConnections = () => {
    let wsCount = 0;
    wss.clients.forEach((client) => {
      if (client.readyState === 1) wsCount += 1;
    });
    console.log(
      `\x1b[90mConnections | WebSocket clients: ${wsCount} | Status probes: ${statusProbeCount} | Meta probes: ${metaProbeCount}\x1b[0m`
    );
  };
  const httpServer = http.createServer((req, res) => {
    let reqPath = (req.url || '/').split('?')[0];
    const probeKind = probeKindFromRequest(req, reqPath);
    if (probeKind === 'status') {
      statusProbeCount += 1;
      logConnections();
    } else if (probeKind === 'meta') {
      metaProbeCount += 1;
      logConnections();
    }
    if (reqPath === `${basePath}/status`) {
      setDevHeaders(res, 'text/plain');
      res.end('packager-status:running');
      return;
    }
    if (reqPath === `${basePath}/meta.json`) {
      const lanIp = getLanIp();
      // Re-resolve to pick up any new bundles generated by tamer-router after a watch-rebuild
      const currentResolved = resolveHostPaths(projectRoot);
      const { lynxBundleFiles: currentBundles, lynxBundleFile: mainBundle } = currentResolved;
      
      const nativeModules = discoverNativeExtensions(projectRoot);
      const androidPackageName = config.android?.packageName?.trim();
      const iosBundleId = config.ios?.bundleId?.trim();
      const idParts = [androidPackageName?.toLowerCase(), iosBundleId?.toLowerCase()].filter(
        (x): x is string => Boolean(x)
      );
      const bundles = currentBundles.map((file) => ({
        file,
        url: `http://${lanIp}:${port}${basePath}/${file.split('/').map(encodeURIComponent).join('/')}`,
      }));
      const meta: Record<string, unknown> = {
        name: projectName,
        slug: projectName,
        bundleUrl: `http://${lanIp}:${port}${basePath}/${mainBundle.split('/').map(encodeURIComponent).join('/')}`,
        bundleFile: mainBundle,
        bundles,
        hostUri: `http://${lanIp}:${port}${basePath}`,
        debuggerHost: `${lanIp}:${port}`,
        developer: { tool: 'tamer4lynx' },
        packagerStatus: 'running',
        nativeModules: nativeModules.map((m) => ({ packageName: m.packageName, moduleClassName: m.moduleClassName })),
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
      setDevHeaders(res, reqPath.endsWith('.bundle') ? 'application/octet-stream' : 'application/javascript');
      res.end(data);
    });
  });

  const wss = new WebSocketServer({ noServer: true });
  httpServer.on('upgrade', (request, socket, head) => {
    const reqPath = (request.url || '').split('?')[0];
    if (reqPath === `${basePath}/__hmr` || reqPath === '/__hmr' || reqPath.endsWith('/__hmr')) {
      wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request));
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress ?? 'unknown';
    console.log(`\x1b[90m[WS] client connected: ${clientIp}\x1b[0m`);
    logConnections();
    ws.send(JSON.stringify({ type: 'connected' }));
    ws.on('close', () => {
      console.log(`\x1b[90m[WS] client disconnected: ${clientIp}\x1b[0m`);
      queueMicrotask(() => logConnections());
    });
    ws.on('error', () => {
      queueMicrotask(() => logConnections());
    });
    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg?.type === 'console_log' && Array.isArray(msg.message)) {
          const skip = msg.message.includes('[rspeedy-dev-server]') || msg.message.includes('[HMR]');
          if (skip) return;
          const isJs = msg.tag === 'lynx-console' || msg.tag == null;
          if (!verbose && !isJs) return;
          const prefix = isJs ? '\x1b[36m[APP]:\x1b[0m' : '\x1b[33m[NATIVE]:\x1b[0m';
          console.log(prefix, ...msg.message);
        }
      } catch {
        /* ignore */
      }
    });
  });

  function broadcastReload() {
    wss.clients.forEach((client) => {
      if (client.readyState === 1) client.send(JSON.stringify({ type: 'reload' }));
    });
  }

  let chokidar: typeof import('chokidar') | null = null;
  let fileWatcher: import('chokidar').FSWatcher | null = null;
  let cancelWatchRebuild: (() => void) | null = null;
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
      const watchRebuild = createDebouncedSerialRebuild(async () => {
        try {
          await runBuild();
          broadcastReload();
          console.log('🔄 Rebuilt, clients notified');
        } catch (e) {
          console.error('Build failed:', (e as Error).message);
        }
      }, WATCH_REBUILD_DEBOUNCE_MS);
      cancelWatchRebuild = watchRebuild.cancel;

      const watcher = chokidar.watch(watchPaths, {
        ignoreInitial: true,
        awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 },
      });
      fileWatcher = watcher;
      watcher.on('all', (eventName) => {
        if (eventName === 'add' || eventName === 'change' || eventName === 'unlink') {
          watchRebuild.schedule();
        }
      });
    }
  }

  try {
    await runBuild();
  } catch (e) {
    console.error('❌ Initial build failed:', (e as Error).message);
    process.exit(1);
  }

  let stopBonjour: (() => Promise<void>) | undefined;

  port = await listenOnAvailablePort(httpServer, preferredPort);
  if (port !== preferredPort) {
    console.log(`\x1b[33m⚠ Configured/default port ${preferredPort} was unavailable; using ${port} for this session.\x1b[0m`);
  }

  {
    void import('dnssd-advertise').then(({ advertise }) => {
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
    }).catch(() => {});
    const lanIp = getLanIp();
    const devUrl = `http://${lanIp}:${port}${basePath}`;
    const wsUrl = `ws://${lanIp}:${port}${basePath}/__hmr`;
    console.log(`\n🚀 Tamer4Lynx dev server (${projectName})`);
    if (verbose) console.log(`   Logs: \x1b[33mverbose\x1b[0m (native + JS)`);
    for (const f of lynxBundleFiles) {
      const enc = f.split('/').map(encodeURIComponent).join('/');
      console.log(`   Bundle:  ${devUrl}/${enc}`);
    }
    console.log(`   Meta:    ${devUrl}/meta.json`);
    console.log(`   HMR WS:  ${wsUrl}`);
    if (stopBonjour) console.log(`   mDNS:    _tamer._tcp (discoverable on LAN)`);
    console.log(`\n   Scan QR or enter in app: ${devUrl}\n`);
    logConnections();
    void import('qrcode-terminal').then((mod) => {
      const qrcode = mod.default ?? mod;
      const deepLinkUrl = `tamerdevapp://${devUrl.replace(/^https?:\/\//, '')}`;
      qrcode.generate(deepLinkUrl, { small: true });
    }).catch(() => {});

    if (process.stdin.isTTY) {
      readline.emitKeypressEvents(process.stdin);
      process.stdin.setRawMode(true);
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      const help = '\x1b[90m  r: refresh  c/Ctrl+L: clear  Ctrl+C: exit\x1b[0m';
      console.log(help);
      process.stdin.on('keypress', (str: string, key: { name: string; ctrl: boolean }) => {
        if (key.ctrl && key.name === 'c') {
          void cleanup();
          return;
        }
        switch (key.name) {
          case 'r':
            runBuild()
              .then(() => {
                broadcastReload();
                console.log('🔄 Refreshed, clients notified');
              })
              .catch((e) => console.error('Build failed:', (e as Error).message));
            break;
          case 'c':
            process.stdout.write('\x1b[2J\x1b[H');
            break;
          case 'l':
            if (key.ctrl) process.stdout.write('\x1b[2J\x1b[H');
            break;
          default:
            break;
        }
      });
    }
  }

  const cleanup = async () => {
    cancelWatchRebuild?.();
    await fileWatcher?.close().catch(() => {});
    buildProcess?.kill();
    await stopBonjour?.();
    httpServer.close();
    wss.close();
    process.exit(0);
  };
  process.on('SIGINT', () => { void cleanup(); });
  process.on('SIGTERM', () => { void cleanup(); });

  await new Promise<void>(() => {});
}

export default startDevServer;
