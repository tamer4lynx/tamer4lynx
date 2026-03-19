import type { DevMode } from "../common/hostConfig";
import { fetchExplorerFile } from "./ref";

export type PatchVars = {
  packageName: string;
  appName: string;
  devMode: DevMode;
  devServer?: { host: string; port: number };
  projectRoot?: string;
};

const EXPLORER_APP =
  "android/lynx_explorer/src/main/java/com/lynx/explorer/ExplorerApplication.java";
const EXPLORER_PROVIDER =
  "android/lynx_explorer/src/main/java/com/lynx/explorer/provider/DemoTemplateProvider.java";

export async function fetchAndPatchApplication(vars: PatchVars): Promise<string> {
  const raw = await fetchExplorerFile(EXPLORER_APP);
  let out = raw
    .replace(/package com\.lynx\.explorer;/, `package ${vars.packageName};`)
    .replace(/public class ExplorerApplication/, "public class App")
    .replace(
      /LynxEnv\.inst\(\)\.init\(this, null, new DemoTemplateProvider\(\), null\);/,
      `LynxEnv.inst().init(this, null, new TemplateProvider(this), null);`
    )
    .replace(/import com\.lynx\.explorer\.provider\.DemoTemplateProvider;/, "")
    .replace(/import com\.lynx\.explorer\.modules\.LynxModuleAdapter;/, "")
    .replace(/import com\.lynx\.explorer\.shell\.LynxRecorderDefaultActionCallback;/, "")
    .replace(/import com\.lynx\.devtool\.recorder\.LynxRecorderPageManager;/, "")
    .replace(/import com\.lynx\.service\.devtool\.LynxDevToolService;/, "")
    .replace(/import com\.lynx\.tasm\.service\.ILynxHttpService;/, "")
    .replace(/import com\.lynx\.tasm\.service\.ILynxImageService;/, "");

  out = out.replace(
    /@Override\s+public void onCreate\(\)\s*\{[\s\S]*?initLynxRecorder\(\);\s*\}/,
    `@Override
 public void onCreate() {
 super.onCreate();
 initLynxService();
 initFresco();
 initLynxEnv();
 }`
  );

  out = out.replace(
    /private void initLynxRecorder\(\)\s*{\s*LynxRecorderPageManager\.getInstance\(\)\.registerCallback\(new LynxRecorderDefaultActionCallback\(\)\);\s*}\s*/,
    ""
  );
  out = out.replace(
    /private void installLynxJSModule\(\)\s*{\s*LynxModuleAdapter\.getInstance\(\)\.Init\(this\);\s*}\s*/,
    ""
  );
  out = out.replace(/\n\s*\/\/ merge it into InitProcessor later\.\s*\n/, "\n");
  out = out.replace(
    /LynxServiceCenter\.inst\(\)\.registerService\(LynxDevToolService\.getINSTANCE\(\)\);\s*\n\s*\/\/ enable all sessions debug[\s\S]*?LynxDevToolService\.getINSTANCE\(\)\.setLoadV8Bridge\(true\);\s*/,
    ""
  );

  out = out.replace(
    /import com\.lynx\.tasm\.service\.LynxServiceCenter;/,
    `import com.lynx.tasm.service.LynxServiceCenter;
import ${vars.packageName}.generated.GeneratedLynxExtensions;
`
  );
  out = out.replace(
    /private void initLynxEnv\(\)\s*\{\s*LynxEnv\.inst\(\)\.init\(this, null, new TemplateProvider\(this\), null\);\s*}/,
    `private void initLynxEnv() {
 GeneratedLynxExtensions.INSTANCE.register(this);
 LynxEnv.inst().init(this, null, new TemplateProvider(this), null);
 }`
  );
  out = out.replace(
    /LynxServiceCenter\.inst\(\)\.registerService\(LynxLogService\.INSTANCE\);/,
    `try {
      Object logService = Class.forName("com.nanofuxion.tamerdevclient.TamerRelogLogService")
        .getField("INSTANCE")
        .get(null);
      logService.getClass().getMethod("init", android.content.Context.class).invoke(logService, this);
      LynxServiceCenter.inst().registerService((com.lynx.tasm.service.ILynxLogService) logService);
    } catch (Exception ignored) {
      LynxServiceCenter.inst().registerService(LynxLogService.INSTANCE);
    }`
  );

  return out.replace(/\n{3,}/g, "\n\n");
}

function getLoadTemplateBody(vars: PatchVars): string {
  const projectSegment = vars.projectRoot
    ? vars.projectRoot.replace(/\\/g, "/").split("/").filter(Boolean).pop() ?? ""
    : "";
  if (vars.devMode !== "embedded") {
    return `    @Override
    public void loadTemplate(String url, final Callback callback) {
        new Thread(() -> {
            try {
                java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
                try (java.io.InputStream is = context.getAssets().open(url)) {
                    byte[] buf = new byte[1024];
                    int n;
                    while ((n = is.read(buf)) != -1) {
                        baos.write(buf, 0, n);
                    }
                }
                callback.onSuccess(baos.toByteArray());
            } catch (java.io.IOException e) {
                callback.onFailed(e.getMessage());
            }
        }).start();
    }`;
  }
  return `    private static final String DEV_CLIENT_BUNDLE = "dev-client.lynx.bundle";
    private static final String PROJECT_BUNDLE_SEGMENT = "${projectSegment}";

    @Override
    public void loadTemplate(String url, final Callback callback) {
        new Thread(() -> {
            if (url != null && (url.equals(DEV_CLIENT_BUNDLE) || url.endsWith("/" + DEV_CLIENT_BUNDLE) || url.contains(DEV_CLIENT_BUNDLE))) {
                try {
                    java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
                    try (java.io.InputStream is = context.getAssets().open(DEV_CLIENT_BUNDLE)) {
                        byte[] buf = new byte[1024];
                        int n;
                        while ((n = is.read(buf)) != -1) baos.write(buf, 0, n);
                    }
                    callback.onSuccess(baos.toByteArray());
                } catch (java.io.IOException e) {
                    callback.onFailed(e.getMessage());
                }
                return;
            }
            if (BuildConfig.DEBUG) {
                String devUrl = DevServerPrefs.INSTANCE.getUrl(context);
                if (devUrl != null && !devUrl.isEmpty()) {
                    try {
                        java.net.URL u = new java.net.URL(devUrl);
                        String origin = u.getProtocol() + "://" + u.getHost() + (u.getPort() > 0 ? ":" + u.getPort() : ":3000");
                        String configuredPath = u.getPath() != null ? u.getPath() : "";
                        configuredPath = configuredPath.replaceAll("/+$", "");

                        java.util.ArrayList<String> candidatePaths = new java.util.ArrayList<>();
                        if (!configuredPath.isEmpty()) candidatePaths.add(configuredPath + "/" + url);
                        if (PROJECT_BUNDLE_SEGMENT != null && !PROJECT_BUNDLE_SEGMENT.isEmpty()) candidatePaths.add("/" + PROJECT_BUNDLE_SEGMENT + "/" + url);
                        candidatePaths.add("/" + url);

                        okhttp3.OkHttpClient client = new okhttp3.OkHttpClient.Builder()
                            .connectTimeout(10, java.util.concurrent.TimeUnit.SECONDS)
                            .readTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
                            .build();
                        for (String candidatePath : candidatePaths) {
                            String fetchUrl = origin + (candidatePath.startsWith("/") ? candidatePath : "/" + candidatePath);
                            okhttp3.Request request = new okhttp3.Request.Builder().url(fetchUrl).build();
                            try (okhttp3.Response response = client.newCall(request).execute()) {
                                if (response.isSuccessful() && response.body() != null) {
                                    callback.onSuccess(response.body().bytes());
                                    return;
                                }
                            }
                        }
                        callback.onFailed("HTTP fetch failed for " + url + " via " + devUrl);
                    } catch (Exception e) {
                        callback.onFailed("Fetch failed: " + (e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName()));
                        return;
                    }
                }
            }
            try {
                java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
                try (java.io.InputStream is = context.getAssets().open(url)) {
                    byte[] buf = new byte[1024];
                    int n;
                    while ((n = is.read(buf)) != -1) {
                        baos.write(buf, 0, n);
                    }
                }
                callback.onSuccess(baos.toByteArray());
            } catch (java.io.IOException e) {
                callback.onFailed(e.getMessage());
            }
        }).start();
    }`;
}

export async function fetchAndPatchTemplateProvider(
  vars: PatchVars
): Promise<string> {
  const raw = await fetchExplorerFile(EXPLORER_PROVIDER);
  const loadBody = getLoadTemplateBody(vars);
  const out = raw
    .replace(/package com\.lynx\.explorer\.provider;/, `package ${vars.packageName};`)
    .replace(/public class DemoTemplateProvider/, "public class TemplateProvider")
    .replace(/extends AbsTemplateProvider \{/, `extends AbsTemplateProvider {
    private final android.content.Context context;

    public TemplateProvider(android.content.Context context) {
        this.context = context.getApplicationContext();
    }

`)
    .replace(
      /@Override\s+public void loadTemplate\(String url, final Callback callback\)\s*\{[\s\S]*?\}\s*\)\s*;\s*\n\s*\}/,
      loadBody
    )
    .replace(/import okhttp3\.ResponseBody;[\s\n]*/, "")
    .replace(/import retrofit2\.Call;[\s\n]*/, "")
    .replace(/import retrofit2\.Response;[\s\n]*/, "")
    .replace(/import retrofit2\.Retrofit;[\s\n]*/, "")
    .replace(/import java\.io\.IOException;[\s\n]*/, "");

  const withBuildConfig = vars.devMode === "embedded"
    ? out.replace(
        /(package [^;]+;)/,
        `$1\nimport ${vars.packageName}.BuildConfig;\nimport ${vars.packageName}.DevServerPrefs;`
      )
    : out;
  return withBuildConfig.replace(/\n{3,}/g, "\n\n");
}

export function getDevClientManager(vars: PatchVars): string | null {
  if (vars.devMode !== "embedded") return null;
  return `package ${vars.packageName}

import android.content.Context
import android.net.Uri
import android.os.Handler
import android.os.Looper
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.WebSocket
import okhttp3.WebSocketListener

class DevClientManager(private val context: Context, private val onReload: Runnable) {
    private var webSocket: WebSocket? = null
    private val handler = Handler(Looper.getMainLooper())
    private val client = OkHttpClient.Builder()
        .connectTimeout(5, java.util.concurrent.TimeUnit.SECONDS)
        .readTimeout(0, java.util.concurrent.TimeUnit.SECONDS)
        .build()

    fun connect() {
        val devUrl = DevServerPrefs.getUrl(context) ?: return
        val uri = Uri.parse(devUrl)
        val scheme = if (uri.scheme == "https") "wss" else "ws"
        val host = uri.host ?: return
        val port = if (uri.port > 0) ":\${uri.port}" else ""
        val path = (uri.path ?: "").let { p -> (if (p.endsWith("/")) p else p + "/") + "__hmr" }
        val wsUrl = "$scheme://$host$port$path"
        val request = Request.Builder()
            .url(wsUrl)
            .build()
        webSocket = client.newWebSocket(request, object : WebSocketListener() {
            override fun onMessage(webSocket: WebSocket, text: String) {
                try {
                    if (text.contains("\\\"type\\\":\\\"reload\\\"")) {
                        handler.post(onReload)
                    }
                } catch (_: Exception) { }
            }
            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) { }
            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) { }
        })
    }

    fun disconnect() {
        webSocket?.close(1000, null)
        webSocket = null
    }
}
`;
}

export function getProjectActivity(vars: PatchVars): string {
  const hasDevClient = vars.devMode === "embedded";

  const devClientInit = hasDevClient
    ? `
        TamerRelogLogService.init(this)
        TamerRelogLogService.connect()
        devClientManager = DevClientManager(this) { reloadProjectView() }
        devClientManager?.connect()
`
    : "";
  const devClientField = hasDevClient ? `    private var devClientManager: DevClientManager? = null
` : "";
  const devClientCleanup = hasDevClient
    ? `
        devClientManager?.disconnect()
        TamerRelogLogService.disconnect()
`
    : "";
  const devClientImports = hasDevClient
    ? `
import ${vars.packageName}.DevClientManager
import com.nanofuxion.tamerdevclient.TamerRelogLogService`
    : "";

  const reloadMethod = hasDevClient
    ? `
    private fun reloadProjectView() {
        GeneratedActivityLifecycle.onViewDetached()
        GeneratedLynxExtensions.onHostViewChanged(null)
        lynxView?.destroy()

        val nextView = buildLynxView()
        lynxView = nextView
        setContentView(nextView)
        GeneratedActivityLifecycle.onViewAttached(nextView)
        GeneratedLynxExtensions.onHostViewChanged(nextView)
        nextView.renderTemplateUrl("main.lynx.bundle", "")
        GeneratedActivityLifecycle.onCreateDelayed(handler)
    }
`
    : "";

  return `package ${vars.packageName}

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.MotionEvent
import android.view.inputmethod.InputMethodManager
import android.widget.EditText
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.lynx.tasm.LynxView
import com.lynx.tasm.LynxViewBuilder${devClientImports}
import ${vars.packageName}.generated.GeneratedLynxExtensions
import ${vars.packageName}.generated.GeneratedActivityLifecycle

class ProjectActivity : AppCompatActivity() {
    private var lynxView: LynxView? = null
${devClientField}    private val handler = Handler(Looper.getMainLooper())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        GeneratedActivityLifecycle.onCreate(intent)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightStatusBars = true
        lynxView = buildLynxView()
        setContentView(lynxView)
        GeneratedActivityLifecycle.onViewAttached(lynxView)
        GeneratedLynxExtensions.onHostViewChanged(lynxView)
        lynxView?.renderTemplateUrl("main.lynx.bundle", "")${devClientInit}
        GeneratedActivityLifecycle.onCreateDelayed(handler)
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        GeneratedActivityLifecycle.onWindowFocusChanged(hasFocus)
    }
${reloadMethod}
    override fun onResume() {
        super.onResume()
        GeneratedActivityLifecycle.onResume()
    }

    override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
        if (ev.action == MotionEvent.ACTION_DOWN) maybeClearFocusedInput(ev)
        return super.dispatchTouchEvent(ev)
    }

    private fun maybeClearFocusedInput(ev: MotionEvent) {
        val focused = currentFocus
        if (focused is EditText) {
            val loc = IntArray(2)
            focused.getLocationOnScreen(loc)
            val x = ev.rawX.toInt()
            val y = ev.rawY.toInt()
            if (x < loc[0] || x > loc[0] + focused.width || y < loc[1] || y > loc[1] + focused.height) {
                focused.clearFocus()
                (getSystemService(INPUT_METHOD_SERVICE) as? InputMethodManager)
                    ?.hideSoftInputFromWindow(focused.windowToken, 0)
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        GeneratedActivityLifecycle.onNewIntent(intent)
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        GeneratedActivityLifecycle.onBackPressed { consumed ->
            if (!consumed) {
                runOnUiThread { super.onBackPressed() }
            }
        }
    }

    override fun onDestroy() {
        GeneratedActivityLifecycle.onViewDetached()
        GeneratedLynxExtensions.onHostViewChanged(null)
        lynxView?.destroy()
        lynxView = null${devClientCleanup}
        super.onDestroy()
    }

    private fun buildLynxView(): LynxView {
        val viewBuilder = LynxViewBuilder()
        viewBuilder.setTemplateProvider(TemplateProvider(this))
        GeneratedLynxExtensions.configureViewBuilder(viewBuilder)
        return viewBuilder.build(this)
    }
}
`;
}

export function getPortraitCaptureActivity(vars: PatchVars): string {
  return `package ${vars.packageName}

import com.journeyapps.barcodescanner.CaptureActivity

class PortraitCaptureActivity : CaptureActivity()
`;
}

export function getStandaloneMainActivity(vars: PatchVars): string {
  const hasDevClient = vars.devMode === "embedded";
  const devClientImports = hasDevClient
    ? `
import android.Manifest
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import androidx.activity.result.contract.ActivityResultContracts
import com.google.zxing.integration.android.IntentIntegrator
import com.google.zxing.integration.android.IntentResult
import com.nanofuxion.tamerdevclient.DevClientModule
`
    : "";
  const devClientInit = hasDevClient
    ? `
        DevClientModule.attachHostActivity(this)
        DevClientModule.attachLynxView(lynxView)
        DevClientModule.attachCameraPermissionRequester { onGranted ->
            pendingScanOnPermissionGranted = onGranted
            cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
        DevClientModule.attachScanLauncher {
            scanResultLauncher.launch(IntentIntegrator(this).setCaptureActivity(PortraitCaptureActivity::class.java).setPrompt("Scan dev server QR").createScanIntent())
        }
        DevClientModule.attachReloadProjectLauncher {
            startActivity(Intent(this@MainActivity, ProjectActivity::class.java).addFlags(
                Intent.FLAG_ACTIVITY_NEW_DOCUMENT or Intent.FLAG_ACTIVITY_MULTIPLE_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            ))
        }
        reloadReceiver = object : BroadcastReceiver() {
            override fun onReceive(ctx: Context, intent: Intent) {
                if (intent.action == DevClientModule.ACTION_RELOAD_PROJECT) {
                    runOnUiThread {
                        startActivity(Intent(this@MainActivity, ProjectActivity::class.java).addFlags(
                            Intent.FLAG_ACTIVITY_NEW_DOCUMENT or Intent.FLAG_ACTIVITY_MULTIPLE_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
                        ))
                    }
                }
            }
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(reloadReceiver, IntentFilter(DevClientModule.ACTION_RELOAD_PROJECT), Context.RECEIVER_NOT_EXPORTED)
        } else {
            registerReceiver(reloadReceiver, IntentFilter(DevClientModule.ACTION_RELOAD_PROJECT))
        }
`
    : "";
  const devClientField = hasDevClient
    ? `    private var reloadReceiver: BroadcastReceiver? = null
    private val currentUri = "dev-client.lynx.bundle"
    private var pendingScanOnPermissionGranted: Runnable? = null
    private val cameraPermissionLauncher = registerForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        if (granted) pendingScanOnPermissionGranted?.run()
        pendingScanOnPermissionGranted = null
    }
    private val scanResultLauncher = registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
        val scanResult = IntentIntegrator.parseActivityResult(result.resultCode, result.data)
        scanResult?.contents?.let { DevClientModule.instance?.deliverScanResult(it) }
    }
`
    : "";

  const devClientCleanup = hasDevClient
    ? `
    override fun onDestroy() {
        reloadReceiver?.let { unregisterReceiver(it) }
        GeneratedActivityLifecycle.onViewDetached()
        GeneratedLynxExtensions.onHostViewChanged(null)
        lynxView?.destroy()
        lynxView = null
        DevClientModule.attachReloadProjectLauncher(null)
        DevClientModule.attachLynxView(null)
        super.onDestroy()
    }
`
    : "";

  const standaloneLifecycle = !hasDevClient
    ? `
    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        GeneratedActivityLifecycle.onWindowFocusChanged(hasFocus)
    }

    override fun onNewIntent(intent: android.content.Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        GeneratedActivityLifecycle.onNewIntent(intent)
    }

    override fun onDestroy() {
        GeneratedActivityLifecycle.onViewDetached()
        GeneratedLynxExtensions.onHostViewChanged(null)
        lynxView?.destroy()
        lynxView = null
        super.onDestroy()
    }
`
    : "";

  return `package ${vars.packageName}

import android.os.Build
import android.os.Bundle
import android.view.MotionEvent
import android.view.inputmethod.InputMethodManager
import android.widget.EditText
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.lynx.tasm.LynxView
import com.lynx.tasm.LynxViewBuilder${devClientImports}
import ${vars.packageName}.generated.GeneratedLynxExtensions
import ${vars.packageName}.generated.GeneratedActivityLifecycle

class MainActivity : AppCompatActivity() {
${devClientField}    private var lynxView: LynxView? = null${!hasDevClient ? '\n    private val handler = android.os.Handler(android.os.Looper.getMainLooper())' : ''}

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        ${!hasDevClient ? 'GeneratedActivityLifecycle.onCreate(intent)\n        ' : ''}WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightStatusBars = true
        lynxView = buildLynxView()
        setContentView(lynxView)
        GeneratedActivityLifecycle.onViewAttached(lynxView)
        GeneratedLynxExtensions.onHostViewChanged(lynxView)
        lynxView?.renderTemplateUrl(${hasDevClient ? 'currentUri' : '"main.lynx.bundle"'}, "")${devClientInit}${!hasDevClient ? '\n        GeneratedActivityLifecycle.onCreateDelayed(handler)' : ''}
    }

    override fun onPause() {
        super.onPause()
        GeneratedActivityLifecycle.onPause()
    }

    override fun onResume() {
        super.onResume()
        GeneratedActivityLifecycle.onResume()
    }

    override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
        if (ev.action == MotionEvent.ACTION_DOWN) maybeClearFocusedInput(ev)
        return super.dispatchTouchEvent(ev)
    }

    private fun maybeClearFocusedInput(ev: MotionEvent) {
        val focused = currentFocus
        if (focused is EditText) {
            val loc = IntArray(2)
            focused.getLocationOnScreen(loc)
            val x = ev.rawX.toInt()
            val y = ev.rawY.toInt()
            if (x < loc[0] || x > loc[0] + focused.width || y < loc[1] || y > loc[1] + focused.height) {
                focused.clearFocus()
                (getSystemService(INPUT_METHOD_SERVICE) as? InputMethodManager)
                    ?.hideSoftInputFromWindow(focused.windowToken, 0)
            }
        }
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        GeneratedActivityLifecycle.onBackPressed { consumed ->
            if (!consumed) {
                runOnUiThread { super.onBackPressed() }
            }
        }
    }

    private fun buildLynxView(): LynxView {
        val viewBuilder = LynxViewBuilder()
        viewBuilder.setTemplateProvider(TemplateProvider(this))
        GeneratedLynxExtensions.configureViewBuilder(viewBuilder)
        return viewBuilder.build(this)
    }${standaloneLifecycle}${devClientCleanup}
}
`;
}
