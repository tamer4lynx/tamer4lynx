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
    /LynxServiceCenter\.inst\(\)\.registerService\(LynxDevToolService\.getINSTANCE\(\)\);\s*\n\s*\/\/ enable (?:all sessions )?debug(?:ging)?[\s\S]*?LynxDevToolService\.getINSTANCE\(\)\.setLoadV8Bridge\(true\);\s*/,
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
    private static final String TAMER_DEBUG_BUNDLE = "tamer-debug.lynx.bundle";
    private static final String PROJECT_BUNDLE_SEGMENT = "${projectSegment}";

    @Override
    public void loadTemplate(String url, final Callback callback) {
        new Thread(() -> {
            if (url != null && (url.equals(DEV_CLIENT_BUNDLE) || url.endsWith("/" + DEV_CLIENT_BUNDLE) || url.contains(DEV_CLIENT_BUNDLE) || url.equals(TAMER_DEBUG_BUNDLE) || url.endsWith("/" + TAMER_DEBUG_BUNDLE) || url.contains(TAMER_DEBUG_BUNDLE))) {
                String bundleName = url.contains(TAMER_DEBUG_BUNDLE) ? TAMER_DEBUG_BUNDLE : DEV_CLIENT_BUNDLE;
                try {
                    java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
                    try (java.io.InputStream is = context.getAssets().open(bundleName)) {
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
            String devUrl = DevServerPrefs.INSTANCE.getUrl(context);
            if (devUrl != null && !devUrl.isEmpty()) {
                try {
                    java.net.URL u = new java.net.URL(devUrl.trim());
                    int port = u.getPort();
                    String host = u.getHost() != null ? u.getHost() : "127.0.0.1";
                    String scheme = u.getProtocol() != null ? u.getProtocol() : "http";
                    String origin;
                    if (port > 0) {
                        origin = scheme + "://" + host + ":" + port;
                    } else if ("http".equalsIgnoreCase(scheme)) {
                        origin = scheme + "://" + host + ":3000";
                    } else {
                        origin = scheme + "://" + host;
                    }
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
  const projectSegment = vars.projectRoot
    ? vars.projectRoot.replace(/\\/g, "/").split("/").filter(Boolean).pop() ?? ""
    : "";
  const embeddedImports = vars.devMode === "embedded"
    ? `import ${vars.packageName}.BuildConfig;
import ${vars.packageName}.DevServerPrefs;
`
    : "";
  const embeddedConstants = vars.devMode === "embedded"
    ? `    private static final String DEV_CLIENT_BUNDLE = "dev-client.lynx.bundle";
    private static final String TAMER_DEBUG_BUNDLE = "tamer-debug.lynx.bundle";
    private static final String PROJECT_BUNDLE_SEGMENT = "${projectSegment}";
`
    : "";
  const embeddedLoadBody = vars.devMode === "embedded"
    ? `        if (isEmbeddedDevShellUrl(url)) {
            return loadAssetBytes(url != null && url.contains(TAMER_DEBUG_BUNDLE) ? TAMER_DEBUG_BUNDLE : DEV_CLIENT_BUNDLE);
        }
        if (BuildConfig.DEBUG) {
            byte[] data = loadFromDevServer(url);
            if (data != null) return data;
        }
`
    : "";
  const embeddedHelpers = vars.devMode === "embedded"
    ? `
    private byte[] loadFromDevServer(String url) {
        String devUrl = DevServerPrefs.INSTANCE.getUrl(context);
        if (devUrl == null || devUrl.isEmpty()) return null;
        try {
            java.net.URL u = new java.net.URL(devUrl.trim());
            int port = u.getPort();
            String host = u.getHost() != null ? u.getHost() : "127.0.0.1";
            String scheme = u.getProtocol() != null ? u.getProtocol() : "http";
            String origin = scheme + "://" + host + (port > 0 ? ":" + port : ("http".equalsIgnoreCase(scheme) ? ":3000" : ""));
            String configuredPath = u.getPath() != null ? u.getPath().replaceAll("/+$", "") : "";
            String normalized = normalizeAssetPath(url);
            java.util.ArrayList<String> candidatePaths = new java.util.ArrayList<>();
            if (!configuredPath.isEmpty()) candidatePaths.add(configuredPath + "/" + normalized);
            if (!PROJECT_BUNDLE_SEGMENT.isEmpty()) candidatePaths.add("/" + PROJECT_BUNDLE_SEGMENT + "/" + normalized);
            candidatePaths.add("/" + normalized);
            okhttp3.OkHttpClient client = new okhttp3.OkHttpClient.Builder()
                .connectTimeout(10, java.util.concurrent.TimeUnit.SECONDS)
                .readTimeout(15, java.util.concurrent.TimeUnit.SECONDS)
                .build();
            for (String candidatePath : candidatePaths) {
                String fetchUrl = origin + (candidatePath.startsWith("/") ? candidatePath : "/" + candidatePath);
                okhttp3.Request request = new okhttp3.Request.Builder().url(fetchUrl).build();
                try (okhttp3.Response response = client.newCall(request).execute()) {
                    if (response.isSuccessful() && response.body() != null) {
                        return response.body().bytes();
                    }
                }
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    private static boolean isEmbeddedDevShellUrl(String url) {
        if (url == null) return false;
        return url.equals(DEV_CLIENT_BUNDLE) || url.endsWith("/" + DEV_CLIENT_BUNDLE) || url.contains(DEV_CLIENT_BUNDLE)
            || url.equals(TAMER_DEBUG_BUNDLE) || url.endsWith("/" + TAMER_DEBUG_BUNDLE) || url.contains(TAMER_DEBUG_BUNDLE);
    }
`
    : "";

  return `package ${vars.packageName};

${embeddedImports}import com.lynx.tasm.provider.AbsTemplateProvider;
import com.lynx.tasm.resourceprovider.LynxResourceCallback;
import com.lynx.tasm.resourceprovider.LynxResourceRequest;
import com.lynx.tasm.resourceprovider.LynxResourceResponse;
import com.lynx.tasm.resourceprovider.LynxResourceResponse.ResponseState;
import com.lynx.tasm.resourceprovider.generic.LynxGenericResourceFetcher;
import com.lynx.tasm.resourceprovider.template.LynxTemplateResourceFetcher;
import com.lynx.tasm.resourceprovider.template.TemplateProviderResult;

public class TemplateProvider extends AbsTemplateProvider {
${embeddedConstants}    private final android.content.Context context;
    public final LynxGenericResourceFetcher genericResourceFetcher;
    public final LynxTemplateResourceFetcher templateResourceFetcher;

    public TemplateProvider(android.content.Context context) {
        this.context = context.getApplicationContext();
        this.genericResourceFetcher = new LynxGenericResourceFetcher() {
            @Override
            public void fetchResource(LynxResourceRequest request, LynxResourceCallback<byte[]> callback) {
                loadBytesAsync(request.getUrl(), callback);
            }

            @Override
            public void fetchResourcePath(LynxResourceRequest request, LynxResourceCallback<String> callback) {
                callback.onResponse(LynxResourceResponse.onFailed(new java.io.IOException("Asset path lookup is not supported")));
            }
        };
        this.templateResourceFetcher = new LynxTemplateResourceFetcher() {
            @Override
            public void fetchTemplate(LynxResourceRequest request, LynxResourceCallback<TemplateProviderResult> callback) {
                loadBytesAsync(request.getUrl(), new LynxResourceCallback<byte[]>() {
                    @Override
                    public void onResponse(LynxResourceResponse<byte[]> response) {
                        if (response.getState() == ResponseState.SUCCESS && response.getData() != null) {
                            callback.onResponse(LynxResourceResponse.onSuccess(TemplateProviderResult.fromBinary(response.getData())));
                        } else {
                            Throwable error = response.getError() != null ? response.getError() : new java.io.IOException("Template load failed");
                            callback.onResponse(LynxResourceResponse.onFailed(error));
                        }
                    }
                });
            }

            @Override
            public void fetchSSRData(LynxResourceRequest request, LynxResourceCallback<byte[]> callback) {
                loadBytesAsync(request.getUrl(), callback);
            }
        };
    }

    @Override
    public void loadTemplate(String url, final Callback callback) {
        new Thread(() -> {
            try {
                callback.onSuccess(loadBytes(url));
            } catch (java.io.IOException e) {
                callback.onFailed(e.getMessage());
            }
        }).start();
    }

    private void loadBytesAsync(String url, LynxResourceCallback<byte[]> callback) {
        new Thread(() -> {
            try {
                callback.onResponse(LynxResourceResponse.onSuccess(loadBytes(url)));
            } catch (java.io.IOException e) {
                callback.onResponse(LynxResourceResponse.onFailed(e));
            }
        }).start();
    }

    private byte[] loadBytes(String url) throws java.io.IOException {
${embeddedLoadBody}        return loadAssetBytes(normalizeAssetPath(url));
    }
${embeddedHelpers}
    private byte[] loadAssetBytes(String assetPath) throws java.io.IOException {
        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
        try (java.io.InputStream is = context.getAssets().open(assetPath)) {
            byte[] buf = new byte[1024];
            int n;
            while ((n = is.read(buf)) != -1) {
                baos.write(buf, 0, n);
            }
        }
        return baos.toByteArray();
    }

    private String normalizeAssetPath(String url) {
        if (url == null) return "";
        String s = url.trim();
        int hash = s.indexOf('#');
        if (hash >= 0) s = s.substring(0, hash);
        int query = s.indexOf('?');
        if (query >= 0) s = s.substring(0, query);
        try {
            java.net.URI uri = new java.net.URI(s);
            if (uri.getScheme() != null && uri.getPath() != null && !uri.getPath().isEmpty()) {
                s = uri.getPath();
            }
        } catch (Exception ignored) {
        }
        s = s.replace('\\\\', '/');
        while (s.startsWith("/")) s = s.substring(1);
        s = stripBeforeMarker(s, ".lynx.bundle/");
        s = stripBeforeMarker(s, ".web.bundle/");
        s = stripBeforeMarker(s, "static/");
        s = stripBeforeMarker(s, "assets/");
        s = stripBeforeMarker(s, "tamer-assets.json");
        String normalized = java.nio.file.Paths.get(s).normalize().toString().replace('\\\\', '/');
        if (normalized.equals("..") || normalized.startsWith("../")) return "";
        return normalized;
    }

    private static String stripBeforeMarker(String value, String marker) {
        int index = value.indexOf(marker);
        if (index < 0) return value;
        if (index == 0) return value;
        if (marker.endsWith("/")) return value.substring(index + marker.length());
        return value.substring(index);
    }
}
`;
}

export function getTamerNavLynxRuntime(vars: Pick<PatchVars, "packageName">): string {
  return `package ${vars.packageName}

import android.content.Context
import com.lynx.tasm.LynxBooleanOption
import com.lynx.tasm.LynxGroup
import com.lynx.tasm.LynxViewBuilder
import com.lynx.tasm.group.ILynxViewGroup
import com.lynx.tasm.group.LynxViewGroupBuilder
import com.lynx.xelement.XElementBehaviors

/**
 * Shared LynxGroup plus per-bundle LynxViewGroups for coordinator LynxViews and TamerNav spokes.
 * Module-singleton stores such as Zustand rely on this shared runtime group.
 */
object TamerNavLynxRuntime {
    val group: LynxGroup = LynxGroup.LynxGroupBuilder()
        .setGroupName("TamerNav")
        .setID(LynxGroup.SINGNLE_GROUP)
        .setEnableJSGroupThread(true)
        .build()

    private val viewGroups = LinkedHashMap<String, ILynxViewGroup>()

    @Synchronized
    fun viewGroup(context: Context, src: String): ILynxViewGroup {
        val key = src.ifBlank { "main.lynx.bundle" }
        return viewGroups.getOrPut(key) {
            val appContext = context.applicationContext ?: context
            val provider = TemplateProvider(appContext)
            val groupBuilder = LynxViewGroupBuilder()
                .setContext(appContext)
                .setUrl(key)
                .setLynxGroup(group)
                .addBehaviors(XElementBehaviors().create())
            groupBuilder.setEnableGenericResourceFetcher(LynxBooleanOption.TRUE)
            groupBuilder.setTemplateResourceFetcher(provider.templateResourceFetcher)
            groupBuilder.setGenericResourceFetcher(provider.genericResourceFetcher)
            groupBuilder.build()
        }
    }

    fun configureBuilder(context: Context, viewBuilder: LynxViewBuilder, src: String) {
        val provider = TemplateProvider(context)
        viewBuilder.setLynxViewGroup(viewGroup(context, src))
        viewBuilder.setLynxGroup(group)
        viewBuilder.setTemplateProvider(provider)
        viewBuilder.setEnableGenericResourceFetcher(LynxBooleanOption.TRUE)
        viewBuilder.setTemplateResourceFetcher(provider.templateResourceFetcher)
        viewBuilder.setGenericResourceFetcher(provider.genericResourceFetcher)
    }
}
`;
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
    private var shouldReconnect = false
    private val handler = Handler(Looper.getMainLooper())
    private val reconnectDelayMs = 3000L
    private val client = OkHttpClient.Builder()
        .connectTimeout(5, java.util.concurrent.TimeUnit.SECONDS)
        .readTimeout(0, java.util.concurrent.TimeUnit.SECONDS)
        .build()

    fun connect() {
        shouldReconnect = true
        connectInternal()
    }

    private fun connectInternal() {
        if (webSocket != null) return
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
            override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                clearSocket()
                scheduleReconnect()
            }
            override fun onClosed(webSocket: WebSocket, code: Int, reason: String) {
                clearSocket()
                scheduleReconnect()
            }
        })
    }

    private fun clearSocket() {
        webSocket = null
    }

    private fun scheduleReconnect() {
        if (!shouldReconnect) return
        handler.postDelayed({ connectInternal() }, reconnectDelayMs)
    }

    fun disconnect() {
        shouldReconnect = false
        handler.removeCallbacksAndMessages(null)
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
        bindProjectCallbacks()
        activeProjectUrl = DevServerPrefs.getUrl(this)?.trim()
        devClientManager = DevClientManager(this) { reloadProjectView() }
        devClientManager?.connect()
`
    : "";
  const devClientField = hasDevClient ? `    private var devClientManager: DevClientManager? = null
    private var activeProjectUrl: String? = null
` : "";
  const devClientCleanup = hasDevClient
    ? `
        TamerNavHost.spokeTemplateSrcNormalizer = null
        DevClientModule.attachHostActivity(null)
        DevClientModule.attachLynxView(null)
        DevClientModule.attachReloadProjectLauncher(null)
        DevClientModule.attachOpenProjectDirectLauncher(null)
        devClientManager?.disconnect()
`
    : "";
  const devClientImports = hasDevClient
    ? `
import ${vars.packageName}.DevClientManager
import ${vars.packageName}.DevServerPrefs
import com.nanofuxion.tamerdevclient.DevClientDebugPanel
import com.nanofuxion.tamerdevclient.DevClientModule`
    : "";

  const projectInstallNativeStack = "";

  const reloadMethod = hasDevClient
    ? `
    private fun reloadProjectView() {
        activeProjectUrl = DevServerPrefs.getUrl(this)?.trim()
        devClientManager?.disconnect()
        GeneratedActivityLifecycle.onViewDetached()
        GeneratedLynxExtensions.onHostViewChanged(null)
        lynxView?.destroy()

        val nextView = buildLynxView()
        lynxView = nextView
        setContentView(nextView)
        GeneratedActivityLifecycle.onViewAttached(nextView)
        GeneratedLynxExtensions.onHostViewChanged(nextView)
        nextView.renderTemplateUrl(projectTemplateKey(), DevClientModule.getProjectInitDataJson(this))
        DevClientModule.attachLynxView(nextView)
        GeneratedActivityLifecycle.onCreateDelayed(handler)
        devClientManager?.connect()
    }

    private fun handleProjectOpenIntent(intent: Intent) {
        val newUrl = intent.getStringExtra("bundleUrl")
            ?: intent.data?.getQueryParameter("bundleUrl")
            ?: return
        if (newUrl.isBlank()) return
        DevServerPrefs.setUrl(this, newUrl.trim())
        reloadProjectView()
    }
`
    : "";

  return `package ${vars.packageName}

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.lynx.tasm.LynxView
import com.lynx.tasm.LynxViewBuilder
import com.lynx.tasm.LynxBooleanOption${devClientImports ? devClientImports : "\n"}
import com.nanofuxion.tamernavigation.stack.TamerNavHost
import ${vars.packageName}.generated.GeneratedLynxExtensions
import ${vars.packageName}.generated.GeneratedActivityLifecycle

class ProjectActivity : AppCompatActivity() {
    private var lynxView: LynxView? = null
${devClientField}    private val handler = Handler(Looper.getMainLooper())
    private val backCallback = object : OnBackPressedCallback(true) {
        override fun handleOnBackPressed() {
            GeneratedActivityLifecycle.onBackPressed { consumed ->
                if (!consumed) {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                    isEnabled = true
                }
            }
        }
    }
${hasDevClient ? `

    private fun bindProjectCallbacks() {
        DevClientModule.attachHostActivity(this)
        DevClientModule.attachLynxView(lynxView)
        DevClientModule.attachReloadProjectLauncher { reloadProjectView() }
        DevClientModule.attachOpenProjectDirectLauncher { bundleUrl ->
            handleProjectOpenIntent(Intent().putExtra("bundleUrl", bundleUrl))
        }
    }` : ""}

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        ${hasDevClient ? "com.nanofuxion.tamerdevclient.LynxDevToolBootstrap.bootstrapDevToolForProjectHost(this)\n        GeneratedLynxExtensions.register(this)" : ""}
        configureTamerNavSpokeBuilder()
        GeneratedActivityLifecycle.onCreate(intent)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightStatusBars = true
        lynxView = buildLynxView()
        setContentView(lynxView)
        GeneratedActivityLifecycle.onViewAttached(lynxView)
        GeneratedLynxExtensions.onHostViewChanged(lynxView)
        lynxView?.renderTemplateUrl(${hasDevClient ? "projectTemplateKey()" : '"main.lynx.bundle"'}, ${hasDevClient ? "DevClientModule.getProjectInitDataJson(this)" : '""'})${devClientInit}
        GeneratedActivityLifecycle.onCreateDelayed(handler)
        onBackPressedDispatcher.addCallback(this, backCallback)
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        GeneratedActivityLifecycle.onWindowFocusChanged(hasFocus)
    }
${reloadMethod}
    override fun onResume() {
        super.onResume()
        ${hasDevClient ? "DevClientModule.setProjectActive(true)\n        DevClientModule.startShakeDetection(this) { DevClientDebugPanel.show(this) }\n        bindProjectCallbacks()\n        val savedUrl = DevServerPrefs.getUrl(this)?.trim()\n        if (!savedUrl.isNullOrBlank() && savedUrl != activeProjectUrl) {\n            reloadProjectView()\n        }\n        " : ""}GeneratedActivityLifecycle.onResume()
    }

    override fun onPause() {
        ${hasDevClient ? "DevClientModule.stopShakeDetection()\n        " : ""}super.onPause()
        GeneratedActivityLifecycle.onPause()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        GeneratedActivityLifecycle.onNewIntent(intent)
        ${hasDevClient ? "handleProjectOpenIntent(intent)" : ""}
    }

    override fun onDestroy() {
        GeneratedActivityLifecycle.onViewDetached()
        GeneratedLynxExtensions.onHostViewChanged(null)
        lynxView?.destroy()
        lynxView = null${devClientCleanup}
        super.onDestroy()
    }

${projectInstallNativeStack}${hasDevClient ? `    private fun projectTemplateKey(): String = DevServerPrefs.projectLynxTemplateKey(this)

` : ""}    private fun buildLynxView(): LynxView {
        val viewBuilder = LynxViewBuilder()
        TamerNavLynxRuntime.configureBuilder(this, viewBuilder, ${hasDevClient ? "projectTemplateKey()" : '"main.lynx.bundle"'})
        GeneratedLynxExtensions.configureViewBuilder(viewBuilder)
        return viewBuilder.build(this)
    }

    private fun configureTamerNavSpokeBuilder() {
        TamerNavHost.configureSharedLynxGroup(TamerNavLynxRuntime.group)
${hasDevClient ? `        TamerNavHost.spokeTemplateSrcNormalizer = { ctx, s ->
            if (s.isBlank() || s.equals("main.lynx.bundle", ignoreCase = true)) {
                DevServerPrefs.projectLynxTemplateKey(ctx)
            } else {
                s
            }
        }
` : ""}        TamerNavHost.sourceSpokeBuilder = { ctx, src ->
            val viewBuilder = LynxViewBuilder()
            TamerNavLynxRuntime.configureBuilder(ctx, viewBuilder, src)
            GeneratedLynxExtensions.configureViewBuilder(viewBuilder)
            viewBuilder.build(ctx)
        }
    }
}
`;
}

/**
 * tamer-dev-app uses a ProjectActivity that differs from the generic tamer-dev-client template
 * (GeneratedLynxExtensions, LynxDevToolBootstrap, bundleUrl, etc.).
 * Emitted by `tamer android bundle` (dev-app) and `tamer android create --target dev-app`.
 * Do not edit ProjectActivity.kt by hand in the dev-app package — change this generator instead.
 */
export function getTamerDevAppProjectActivity(packageName: string): string {
  return `package ${packageName}

import android.content.Intent
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.lynx.tasm.LynxView
import com.lynx.tasm.LynxViewBuilder
import com.lynx.tasm.LynxBooleanOption
import ${packageName}.DevClientManager
import ${packageName}.DevServerPrefs
import com.nanofuxion.tamerdevclient.DevClientModule
import com.nanofuxion.tamerdevclient.LynxDevToolBootstrap
import com.nanofuxion.tamerinsets.TamerInsetsModule
import com.nanofuxion.tamernavigation.stack.TamerNavHost
import ${packageName}.generated.GeneratedLynxExtensions
import ${packageName}.generated.GeneratedActivityLifecycle
import com.nanofuxion.tamerdevclient.DevClientDebugPanel

class ProjectActivity : AppCompatActivity() {
    private var lynxView: LynxView? = null
    private var devClientManager: DevClientManager? = null
    private var activeProjectUrl: String? = null
    private val handler = Handler(Looper.getMainLooper())
    private val backCallback = object : OnBackPressedCallback(true) {
        override fun handleOnBackPressed() {
            GeneratedActivityLifecycle.onBackPressed { consumed ->
                if (!consumed) {
                    isEnabled = false
                    onBackPressedDispatcher.onBackPressed()
                    isEnabled = true
                }
            }
        }
    }

    private fun bindProjectCallbacks() {
        DevClientModule.attachHostActivity(this)
        DevClientModule.attachLynxView(lynxView)
        DevClientModule.attachReloadProjectLauncher { reloadProjectView() }
        DevClientModule.attachOpenProjectDirectLauncher { bundleUrl ->
            handleProjectOpenIntent(Intent().putExtra("bundleUrl", bundleUrl))
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        LynxDevToolBootstrap.bootstrapDevToolForProjectHost(this)
        GeneratedLynxExtensions.register(this)
        configureTamerNavSpokeBuilder()
        GeneratedActivityLifecycle.onCreate(intent)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightStatusBars = true
        lynxView = buildLynxView()
        setContentView(lynxView)
        GeneratedActivityLifecycle.onViewAttached(lynxView)
        GeneratedLynxExtensions.onHostViewChanged(lynxView)
        lynxView?.renderTemplateUrl(projectTemplateKey(), projectInitDataWithInsetsSnapshot(this))
        bindProjectCallbacks()
        activeProjectUrl = DevServerPrefs.getUrl(this)?.trim()
        devClientManager = DevClientManager(this) { reloadProjectView() }
        devClientManager?.connect()
        GeneratedActivityLifecycle.onCreateDelayed(handler)
        onBackPressedDispatcher.addCallback(this, backCallback)
    }

    override fun onPause() {
        DevClientModule.stopShakeDetection()
        super.onPause()
        GeneratedActivityLifecycle.onPause()
    }

    private fun reloadProjectView() {
        activeProjectUrl = DevServerPrefs.getUrl(this)?.trim()
        devClientManager?.disconnect()
        GeneratedActivityLifecycle.onViewDetached()
        GeneratedLynxExtensions.onHostViewChanged(null)
        lynxView?.destroy()

        val nextView = buildLynxView()
        lynxView = nextView
        setContentView(nextView)
        GeneratedActivityLifecycle.onViewAttached(nextView)
        GeneratedLynxExtensions.onHostViewChanged(nextView)
        nextView.renderTemplateUrl(projectTemplateKey(), projectInitDataWithInsetsSnapshot(this))
        DevClientModule.attachLynxView(nextView)
        GeneratedActivityLifecycle.onCreateDelayed(handler)
        devClientManager?.connect()
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        GeneratedActivityLifecycle.onWindowFocusChanged(hasFocus)
    }

    override fun onResume() {
        super.onResume()
        DevClientModule.setProjectActive(true)
        DevClientModule.startShakeDetection(this) { DevClientDebugPanel.show(this) }
        bindProjectCallbacks()
        val savedUrl = DevServerPrefs.getUrl(this)?.trim()
        if (!savedUrl.isNullOrBlank() && savedUrl != activeProjectUrl) {
            reloadProjectView()
        }
        GeneratedActivityLifecycle.onResume()
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        GeneratedActivityLifecycle.onNewIntent(intent)
        handleProjectOpenIntent(intent)
    }

    private fun handleProjectOpenIntent(intent: Intent) {
        val newUrl = intent.getStringExtra("bundleUrl")
            ?: intent.data?.getQueryParameter("bundleUrl")
            ?: return
        if (newUrl.isBlank()) return
        DevServerPrefs.setUrl(this, newUrl.trim())
        reloadProjectView()
    }

    override fun onDestroy() {
        DevClientModule.setProjectActive(false)
        TamerNavHost.spokeTemplateSrcNormalizer = null
        DevClientModule.attachHostActivity(null)
        DevClientModule.attachLynxView(null)
        DevClientModule.attachReloadProjectLauncher(null)
        DevClientModule.attachOpenProjectDirectLauncher(null)
        GeneratedActivityLifecycle.onViewDetached()
        GeneratedLynxExtensions.onHostViewChanged(null)
        lynxView?.destroy()
        lynxView = null
        devClientManager?.disconnect()
        super.onDestroy()
    }

    private fun projectTemplateKey(): String = DevServerPrefs.projectLynxTemplateKey(this)

    private fun projectInitDataWithInsetsSnapshot(ctx: android.content.Context): String {
        val baseJson = DevClientModule.getProjectInitDataJson(ctx)
        val snapshot = TamerInsetsModule.currentInsetsSnapshotJson() ?: return baseJson
        val trimmed = baseJson.trim()
        val injection = "\\"__tamerInsetsSnapshot\\":$snapshot"
        return when {
            trimmed.isEmpty() || trimmed == "{}" -> "{$injection}"
            trimmed.startsWith("{") && trimmed.endsWith("}") -> {
                val inner = trimmed.substring(1, trimmed.length - 1).trim()
                if (inner.isEmpty()) "{$injection}" else "{$injection,$inner}"
            }
            else -> baseJson
        }
    }

    private fun buildLynxView(): LynxView {
        val viewBuilder = LynxViewBuilder()
        TamerNavLynxRuntime.configureBuilder(this, viewBuilder, projectTemplateKey())
        GeneratedLynxExtensions.configureViewBuilder(viewBuilder)
        return viewBuilder.build(this)
    }

    private fun configureTamerNavSpokeBuilder() {
        TamerNavHost.configureSharedLynxGroup(TamerNavLynxRuntime.group)
        TamerNavHost.spokeTemplateSrcNormalizer = { ctx, s ->
            if (s.isBlank() || s.equals("main.lynx.bundle", ignoreCase = true)) {
                DevServerPrefs.projectLynxTemplateKey(ctx)
            } else {
                s
            }
        }
        TamerNavHost.sourceSpokeBuilder = { ctx, src ->
            val viewBuilder = LynxViewBuilder()
            TamerNavLynxRuntime.configureBuilder(ctx, viewBuilder, src)
            GeneratedLynxExtensions.configureViewBuilder(viewBuilder)
            viewBuilder.build(ctx)
        }
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
import android.os.Handler
import android.os.Looper
import androidx.activity.result.contract.ActivityResultContracts
import com.google.zxing.integration.android.IntentIntegrator
import com.nanofuxion.tamerdevclient.DevClientModule
`
    : "";
  const mainInstallNativeStack = "";
  const devClientInit = hasDevClient
    ? `
        DevClientModule.attachHostActivity(this)
        DevClientModule.attachLynxView(lynxView)
        bindLauncherCallbacks()
        DevClientModule.attachCameraPermissionRequester { onGranted ->
            pendingScanOnPermissionGranted = onGranted
            cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
        }
        DevClientModule.attachScanLauncher {
            scanResultLauncher.launch(IntentIntegrator(this).setCaptureActivity(PortraitCaptureActivity::class.java).setPrompt("Scan dev server QR").createScanIntent())
        }
        reloadReceiver = object : BroadcastReceiver() {
            override fun onReceive(ctx: Context, intent: Intent) {
                if (intent.action == DevClientModule.ACTION_RELOAD_PROJECT) {
                    runOnUiThread {
                        launchProjectActivity()
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
    private val handler = Handler(Looper.getMainLooper())
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
        DevClientModule.attachOpenProjectDirectLauncher(null)
        DevClientModule.attachHostActivity(null)
        DevClientModule.attachLynxView(null)
        super.onDestroy()
    }
`
    : "";

  const windowFocusAndNewIntent = `
    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        GeneratedActivityLifecycle.onWindowFocusChanged(hasFocus)
    }

    override fun onNewIntent(intent: android.content.Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        GeneratedActivityLifecycle.onNewIntent(intent)
    }
`;

  const standaloneLifecycle = !hasDevClient
    ? `${windowFocusAndNewIntent}
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

import android.app.ActivityManager
import android.os.Build
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.lynx.tasm.LynxView
import com.lynx.tasm.LynxViewBuilder
import com.lynx.tasm.LynxBooleanOption
${devClientImports}import com.nanofuxion.tamernavigation.stack.TamerNavHost
import ${vars.packageName}.generated.GeneratedLynxExtensions
import ${vars.packageName}.generated.GeneratedActivityLifecycle

class MainActivity : AppCompatActivity() {
${devClientField}    private var lynxView: LynxView? = null${!hasDevClient ? '\n    private val handler = android.os.Handler(android.os.Looper.getMainLooper())' : ''}

${hasDevClient ? `    private fun launchProjectActivity(bundleUrl: String? = null) {
        val activityManager = getSystemService(ActivityManager::class.java)
        val existingTask = activityManager?.appTasks?.firstOrNull { task ->
            val info = task.taskInfo
            info.baseActivity?.className == ProjectActivity::class.java.name
                || info.topActivity?.className == ProjectActivity::class.java.name
        }
        val intent = Intent(this@MainActivity, ProjectActivity::class.java).apply {
            if (!bundleUrl.isNullOrBlank()) {
                putExtra("bundleUrl", bundleUrl)
            }
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
        }
        if (existingTask != null) {
            existingTask.moveToFront()
        }
        startActivity(intent)
    }

    private fun bindLauncherCallbacks() {
        DevClientModule.attachReloadProjectLauncher {
            launchProjectActivity()
        }
        DevClientModule.attachOpenProjectDirectLauncher { bundleUrl ->
            launchProjectActivity(bundleUrl)
        }
    }
` : ""}

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        GeneratedLynxExtensions.register(this)
        configureTamerNavSpokeBuilder()
        GeneratedActivityLifecycle.onCreate(intent)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightStatusBars = true
        lynxView = buildLynxView()
        setContentView(lynxView)
        GeneratedActivityLifecycle.onViewAttached(lynxView)
        GeneratedLynxExtensions.onHostViewChanged(lynxView)
        ${
          hasDevClient
            ? `lynxView?.renderTemplateUrl(currentUri, "")`
            : `lynxView?.renderTemplateUrl("main.lynx.bundle", "")`
        }${devClientInit}
        GeneratedActivityLifecycle.onCreateDelayed(handler)
    }

    override fun onPause() {
        super.onPause()
        GeneratedActivityLifecycle.onPause()
    }

    override fun onResume() {
        super.onResume()
        GeneratedActivityLifecycle.onResume()${hasDevClient ? `
        DevClientModule.attachHostActivity(this)
        DevClientModule.attachLynxView(lynxView)
        bindLauncherCallbacks()
        GeneratedLynxExtensions.onHostViewChanged(lynxView)` : ""}
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        GeneratedActivityLifecycle.onBackPressed { consumed ->
            if (!consumed) {
                runOnUiThread { super.onBackPressed() }
            }
        }
    }

${mainInstallNativeStack}    private fun buildLynxView(): LynxView {
        val viewBuilder = LynxViewBuilder()
        ${
          hasDevClient
            ? `TamerNavLynxRuntime.configureBuilder(this, viewBuilder, currentUri)`
            : `TamerNavLynxRuntime.configureBuilder(this, viewBuilder, "main.lynx.bundle")`
        }
        GeneratedLynxExtensions.configureViewBuilder(viewBuilder)
        return viewBuilder.build(this)
    }

    private fun configureTamerNavSpokeBuilder() {
        TamerNavHost.configureSharedLynxGroup(TamerNavLynxRuntime.group)
        TamerNavHost.sourceSpokeBuilder = { ctx, src ->
            val viewBuilder = LynxViewBuilder()
            TamerNavLynxRuntime.configureBuilder(ctx, viewBuilder, src)
            GeneratedLynxExtensions.configureViewBuilder(viewBuilder)
            viewBuilder.build(ctx)
        }
    }${hasDevClient ? windowFocusAndNewIntent : standaloneLifecycle}${devClientCleanup}
}
`;
}

/** Second Activity: optional extra Lynx surface (e.g. initData from intent extras). */
export function getLynxPushActivity(vars: PatchVars): string {
  return `package ${vars.packageName}

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsControllerCompat
import com.lynx.tasm.LynxView
import com.lynx.tasm.LynxViewBuilder
import com.lynx.tasm.LynxBooleanOption
import com.nanofuxion.tamerdevclient.DevClientModule
import com.nanofuxion.tamerrouter.TamerRouterNativeModule
import org.json.JSONObject
import ${vars.packageName}.generated.GeneratedLynxExtensions
import ${vars.packageName}.generated.GeneratedActivityLifecycle

class LynxPushActivity : AppCompatActivity() {
    private var lynxView: LynxView? = null
    private val handler = Handler(Looper.getMainLooper())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        GeneratedLynxExtensions.register(this)
        GeneratedActivityLifecycle.onCreate(intent)
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).isAppearanceLightStatusBars = true
        val initDataJson = intent.getStringExtra(EXTRA_INIT_DATA) ?: ""
        val launchUrl = intent.getStringExtra(EXTRA_LAUNCH_URL)
        if (!launchUrl.isNullOrBlank()) {
            com.nanofuxion.tamerlinking.LinkingModule.setInitialUrl(launchUrl)
        }
        val bundleUrl = resolveBundleUrl(initDataJson)
        lynxView = buildLynxView()
        setContentView(lynxView)
        GeneratedActivityLifecycle.onViewAttached(lynxView)
        GeneratedLynxExtensions.onHostViewChanged(lynxView)
        lynxView?.renderTemplateUrl(bundleUrl, initDataJson)
        TamerRouterNativeModule.attachHostView(lynxView)
        DevClientModule.attachHostActivity(this)
        DevClientModule.attachLynxView(lynxView)
        GeneratedActivityLifecycle.onCreateDelayed(handler)
    }

    override fun onResume() {
        super.onResume()
        GeneratedActivityLifecycle.onResume()
        DevClientModule.attachHostActivity(this)
        DevClientModule.attachLynxView(lynxView)
        GeneratedLynxExtensions.onHostViewChanged(lynxView)
    }

    override fun onPause() {
        super.onPause()
        GeneratedActivityLifecycle.onPause()
    }

    override fun onDestroy() {
        GeneratedActivityLifecycle.onViewDetached()
        GeneratedLynxExtensions.onHostViewChanged(null)
        TamerRouterNativeModule.attachHostView(null)
        lynxView?.destroy()
        lynxView = null
        DevClientModule.attachHostActivity(null)
        DevClientModule.attachLynxView(null)
        super.onDestroy()
    }

    override fun finish() {
        super.finish()
        overridePendingTransition(R.anim.tamer_stack_pop_enter, R.anim.tamer_stack_pop_exit)
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
        TamerNavLynxRuntime.configureBuilder(this, viewBuilder, "main.lynx.bundle")
        GeneratedLynxExtensions.configureViewBuilder(viewBuilder)
        return viewBuilder.build(this)
    }

    private fun resolveBundleUrl(initDataJson: String): String {
        val fromExtra = intent.getStringExtra(EXTRA_BUNDLE)
        if (!fromExtra.isNullOrBlank()) return fromExtra
        if (initDataJson.isNotBlank()) {
            try {
                val u = JSONObject(initDataJson).optString("bundleUrl")
                if (u.isNotBlank()) return u
            } catch (_: Exception) { }
        }
        return BUNDLE_DEV_CLIENT
    }

    companion object {
        const val EXTRA_INIT_DATA = "tamer_init_data_json"
        const val EXTRA_LAUNCH_URL = "tamer_launch_url"
        const val EXTRA_BUNDLE = "tamer_bundle_url"
        private const val BUNDLE_DEV_CLIENT = "dev-client.lynx.bundle"
    }
}
`;
}
