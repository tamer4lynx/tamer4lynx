import { spawn } from 'child_process';
import fs from 'fs';
import http from 'http';
import os from 'os';
import path from 'path';
import { WebSocketServer } from 'ws';
import { discoverNativeExtensions } from './config';
import { resolveHostPaths, resolveIconPaths } from './hostConfig';

const DEFAULT_PORT = 3000;

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

async function startDevServer() {
  const resolved = resolveHostPaths();
  const { projectRoot, lynxProjectDir, lynxBundlePath, lynxBundleFile, config } = resolved;
  const distDir = path.dirname(lynxBundlePath);
  const port = config.devServer?.port ?? config.devServer?.httpPort ?? DEFAULT_PORT;

  let buildProcess: ReturnType<typeof spawn> | null = null;

  function runBuild(): Promise<void> {
    return new Promise((resolve, reject) => {
      buildProcess = spawn('npm', ['run', 'build'], {
        cwd: lynxProjectDir,
        stdio: 'pipe',
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

  const projectName = path.basename(lynxProjectDir);
  const basePath = `/${projectName}`;
  const iconPaths = resolveIconPaths(projectRoot, config);
  let iconFilePath: string | null = null;
  if (iconPaths?.source && fs.statSync(iconPaths.source).isFile()) {
    iconFilePath = iconPaths.source;
  } else if (iconPaths?.android) {
    const androidIcon = path.join(iconPaths.android, 'mipmap-xxxhdpi', 'ic_launcher.png');
    if (fs.existsSync(androidIcon)) iconFilePath = androidIcon;
  } else if (iconPaths?.ios) {
    const iosIcon = path.join(iconPaths.ios, 'Icon-1024.png');
    if (fs.existsSync(iosIcon)) iconFilePath = iosIcon;
  }
  const iconExt = iconFilePath ? path.extname(iconFilePath) || '.png' : '';
  const iconMime: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
  };

  const httpServer = http.createServer((req, res) => {
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
      const meta: Record<string, unknown> = {
        name: projectName,
        slug: projectName,
        bundleUrl: `http://${lanIp}:${port}${basePath}/${lynxBundleFile}`,
        bundleFile: lynxBundleFile,
        hostUri: `http://${lanIp}:${port}${basePath}`,
        debuggerHost: `${lanIp}:${port}`,
        developer: { tool: 'tamer4lynx' },
        packagerStatus: 'running',
        nativeModules: nativeModules.map((m) => ({ packageName: m.packageName, moduleClassName: m.moduleClassName })),
      };
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
        res.setHeader('Content-Type', iconMime[iconExt] ?? 'image/png');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(data);
      });
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

  const wss = new WebSocketServer({ noServer: true });
  httpServer.on('upgrade', (request, socket, head) => {
    if (request.url === `${basePath}/__hmr` || request.url === '/__hmr') {
      wss.handleUpgrade(request, socket, head, (ws) => wss.emit('connection', ws, request));
    } else {
      socket.destroy();
    }
  });

  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'connected' }));
  });

  function broadcastReload() {
    wss.clients.forEach((client) => {
      if (client.readyState === 1) client.send(JSON.stringify({ type: 'reload' }));
    });
  }

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
      const watcher = chokidar.watch(watchPaths, { ignoreInitial: true });
      watcher.on('change', async () => {
        try {
          await runBuild();
          broadcastReload();
          console.log('🔄 Rebuilt, clients notified');
        } catch (e) {
          console.error('Build failed:', (e as Error).message);
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

  httpServer.listen(port, '0.0.0.0', () => {
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
    console.log(`   Bundle:  ${devUrl}/${lynxBundleFile}`);
    console.log(`   Meta:    ${devUrl}/meta.json`);
    console.log(`   HMR WS:  ${wsUrl}`);
    if (stopBonjour) console.log(`   mDNS:    _tamer._tcp (discoverable on LAN)`);
    console.log(`\n   Scan QR or enter in app: ${devUrl}\n`);
    void import('qrcode-terminal').then((mod) => {
      const qrcode = mod.default ?? mod;
      qrcode.generate(devUrl, { small: true });
    }).catch(() => {});
  });

  const cleanup = async () => {
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
