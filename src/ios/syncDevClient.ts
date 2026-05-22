import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { randomBytes } from 'crypto';
import { resolveDevAppPaths, findDevClientPackage, resolveIconPaths, type HostConfig } from '../common/hostConfig';
import { copyDistAssets } from '../common/copyDistAssets';
import { applyIosAppIconAssets } from '../common/syncAppIcons';
import { setupCocoaPods } from './getPod';
import ios_autolink from './autolink';
import { addResourceFolderToXcodeProject, addResourceToXcodeProject } from './syncHost';
import { PODFILE_POST_INSTALL_BUILD_SPEED_RUBY } from './iosBuildSpeed';

function readAndSubstituteTemplate(
    templatePath: string,
    vars: Record<string, string>
): string {
    const raw = fs.readFileSync(templatePath, 'utf-8');
    return Object.entries(vars).reduce(
        (s, [k, v]) => s.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), v),
        raw
    );
}

const APP_NAME = 'TamerDevApp';
const BUNDLE_ID = 'com.nanofuxion.tamerdevapp';
const BRIDGING_HEADER = `${APP_NAME}-Bridging-Header.h`;

function generateId() {
    return randomBytes(12).toString('hex').toUpperCase();
}

function writeFile(filePath: string, content: string): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf8');
}

function getAppDelegateSwift(): string {
    return `import UIKit
import tamerlinking

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        LynxInitProcessor.shared.setupEnvironment()
        if let url = launchOptions?[.url] as? URL {
            let s = url.absoluteString
            LinkingModule.setInitialUrl(s)
            LinkingModule.onUrlReceived(s)
        }

        window = UIWindow(frame: UIScreen.main.bounds)
        window?.rootViewController = DevLauncherViewController()
        window?.makeKeyAndVisible()
        return true
    }

    func application(_ app: UIApplication, open url: URL,
                     options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        let s = url.absoluteString
        LinkingModule.setInitialUrl(s)
        LinkingModule.onUrlReceived(s)
        if url.scheme == "tamerdevapp", let host = url.host, host == "project" {
            let bundleUrl = URLComponents(url: url, resolvingAgainstBaseURL: false)?
                .queryItems?
                .first(where: { $0.name == "bundleUrl" })?
                .value
            presentProjectViewController(bundleUrl: bundleUrl)
        }
        return true
    }

    @objc func presentProjectViewController(bundleUrl: String? = nil) {
        if let bundleUrl, !bundleUrl.isEmpty {
            DevServerPrefs.setUrl(bundleUrl)
        }
        guard let root = window?.rootViewController else { return }
        if root.presentedViewController is ProjectViewController {
            return
        }
        guard root.presentedViewController == nil else { return }
        let projectVC = ProjectViewController()
        projectVC.modalPresentationStyle = .fullScreen
        root.present(projectVC, animated: true)
    }
}
`;
}

function getDevLauncherViewControllerSwift(): string {
    return fs.readFileSync(
        path.join(__dirname, '../../packages/tamer-dev-client/ios/templates/DevLauncherViewController.swift'),
        'utf8'
    );
}

export function getProjectViewControllerSwift(): string {
    return `import UIKit
import Lynx
import tamerdevclient
import tamerinsets
import tamersystemui
#if canImport(tamerrouter)
import tamerrouter
#endif
#if canImport(tamernavigation)
import tamernavigation
#endif

private func tamer_project_disableLynxLongPressMenuIfAvailable() {
    guard let cls = NSClassFromString("LynxDevtoolEnv") else { return }
    let sel = NSSelectorFromString("sharedInstance")
    guard let env = (cls as AnyObject).perform(sel)?.takeUnretainedValue() as? NSObject else { return }
    env.setValue(false, forKey: "longPressMenuEnabled")
}

/// Shared with TamerNav stack spokes (\`TamerNavHost.applySpokeBuilder\`); required for one JS context group.
private enum TamerNavLynxRuntime {
    static let sharedGroup: LynxGroup = {
        let option = LynxGroupOption()
        option.enableJSGroupThread = true
        return LynxGroup(name: "TamerNav", with: option)
    }()

    private static var viewGroups: [String: LynxViewGroup] = [:]

    static func viewGroup(src: String, provider: DevTemplateProvider) -> LynxViewGroup {
        let key = src.isEmpty ? "main.lynx.bundle" : src
        if let existing = viewGroups[key] {
            return existing
        }
        let group = LynxViewGroup(url: key, templateFetcher: provider)
        group.group = sharedGroup
        group.enableGenericResourceFetcher = .true
        group.config = LynxConfig(provider: provider)
        group.templateResourceFetcher = provider
        group.genericResourceFetcher = provider
        viewGroups[key] = group
        return group
    }

    static func configureBuilder(_ builder: LynxViewBuilder, src: String, provider: DevTemplateProvider) {
        builder.lynxViewGroup = viewGroup(src: src, provider: provider)
        builder.group = sharedGroup
        builder.enableGenericResourceFetcher = .true
        builder.config = LynxConfig(provider: provider)
        builder.templateResourceFetcher = provider
        builder.genericResourceFetcher = provider
    }
}

class ProjectViewController: UIViewController {
    private var lynxView: LynxView?
    private var devMenuView: LynxView?
    private var devClientManager: DevClientManager?
    private var previousDismissTamerDebugPanelHandler: (() -> Void)?
    private var hasTriggeredInitialProjectLoad = false
    private var pendingInitialLoadWorkItem: DispatchWorkItem?
    var onDismiss: (() -> Void)?
    private lazy var projectDevMenuGesture: UILongPressGestureRecognizer = {
        let gesture = UILongPressGestureRecognizer(target: self, action: #selector(handleProjectDevMenuGesture(_:)))
        gesture.minimumPressDuration = 0.52
        gesture.numberOfTouchesRequired = 3
        gesture.cancelsTouchesInView = false
        return gesture
    }()

    override func viewDidLoad() {
        super.viewDidLoad()
        NSLog("[ProjectVC] viewDidLoad")
#if DEBUG
        let env = LynxEnv.sharedInstance()
        env.lynxDebugEnabled = true
        env.devtoolEnabled = true
        env.logBoxEnabled = true
#endif
        tamer_project_disableLynxLongPressMenuIfAvailable()
        view.backgroundColor = .black
        edgesForExtendedLayout = .all
        extendedLayoutIncludesOpaqueBars = true
        additionalSafeAreaInsets = .zero
        view.insetsLayoutMarginsFromSafeArea = false
        view.preservesSuperviewLayoutMargins = false
        if #available(iOS 15.0, *) {
            viewRespectsSystemMinimumLayoutMargins = false
        }
        setupLynxView()
        devClientManager = DevClientManager(onReload: { [weak self] in
            self?.reloadLynxView()
        })
        devClientManager?.connect()
        TamerRelogLogService.connect()
#if DEBUG
        view.addGestureRecognizer(projectDevMenuGesture)
#endif
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        NSLog("[ProjectVC] viewWillAppear")
        // Do NOT override reloadProjectHandler — DevClientManager handles HMR via WebSocket.
        // ViewController's handler stays active and ignores repeat calls while we're presented
        // (presentedViewController is ProjectViewController → return).
        // Overriding it causes ViewController's background dev-client Lynx to loop-reload us.
#if DEBUG
        previousDismissTamerDebugPanelHandler = DevClientModule.dismissTamerDebugPanelHandler
        DevClientModule.dismissTamerDebugPanelHandler = { [weak self] in
            self?.dismissProjectDevMenu()
        }
#endif
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        triggerInitialProjectLoadIfNeeded(reason: "viewDidAppear")
    }

    override func motionEnded(_ motion: UIEvent.EventSubtype, with event: UIEvent?) {
#if DEBUG
        ShakeDetector.handleMotionEnded(motion) { [weak self] in
            self?.showProjectDevMenu()
        }
#endif
        super.motionEnded(motion, with: event)
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        if let lynxView = lynxView {
            applyFullscreenLayout(to: lynxView)
        }
        if let devMenuView = devMenuView {
            applyFullscreenLayout(to: devMenuView)
        }
        triggerInitialProjectLoadIfNeeded(reason: "viewDidLayoutSubviews")
    }

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        disableAutomaticInsetAdjustment()
        TamerInsetsModule.reRequestInsets()
        triggerInitialProjectLoadIfNeeded(reason: "viewSafeAreaInsetsDidChange")
    }

    override var preferredStatusBarStyle: UIStatusBarStyle { SystemUIModule.statusBarStyleForHost }

    private func buildLynxView() -> LynxView {
        let size = fullscreenBounds().size
        let lv = LynxView { builder in
            let provider = DevTemplateProvider()
#if canImport(tamernavigation)
            TamerNavLynxRuntime.configureBuilder(builder, src: "main.lynx.bundle", provider: provider)
#else
            builder.enableGenericResourceFetcher = .true
            builder.config = LynxConfig(provider: provider)
            builder.templateResourceFetcher = provider
            builder.genericResourceFetcher = provider
#endif
            builder.screenSize = size
            builder.fontScale = 1.0
        }
        lv.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        lv.insetsLayoutMarginsFromSafeArea = false
        lv.preservesSuperviewLayoutMargins = false
        applyFullscreenLayout(to: lv)
        return lv
    }

    private func setupLynxView() {
        NSLog("[ProjectVC] setupLynxView devUrl=%@", DevServerPrefs.getUrl() ?? "")
#if canImport(tamernavigation)
        TamerNavHost.configureSharedGroup(TamerNavLynxRuntime.sharedGroup)
        TamerNavHost.configureSpokeBuilder = { builder, src in
            let provider = DevTemplateProvider()
            TamerNavLynxRuntime.configureBuilder(builder, src: src, provider: provider)
        }
#endif
        let lv = buildLynxView()
        lv.backgroundColor = .black
        lv.isHidden = false
        lv.alpha = 1
        lv.isUserInteractionEnabled = true
        view.addSubview(lv)
        TamerInsetsModule.attachHostView(lv)
#if canImport(tamerrouter)
        TamerRouterNativeModule.attachHostView(lv)
#endif
#if canImport(tamernavigation)
        TamerNavHost.attachRoot(lv, presenter: self)
#endif
        disableAutomaticInsetAdjustment(in: lv)
        pendingInitialLoadWorkItem?.cancel()
        pendingInitialLoadWorkItem = nil
        hasTriggeredInitialProjectLoad = false
        self.lynxView = lv
    }

    private func reloadLynxView() {
        NSLog("[ProjectVC] reloadLynxView")
        dismissProjectDevMenu()
        pendingInitialLoadWorkItem?.cancel()
        pendingInitialLoadWorkItem = nil
        TamerInsetsModule.attachHostView(nil)
#if canImport(tamerrouter)
        TamerRouterNativeModule.attachHostView(nil)
#endif
#if canImport(tamernavigation)
        TamerNavHost.attachRoot(nil, presenter: self)
#endif
        lynxView?.removeFromSuperview()
        lynxView = nil
        setupLynxView()
        triggerInitialProjectLoadIfNeeded(reason: "reloadLynxView")
    }

    private func triggerInitialProjectLoadIfNeeded(reason: String) {
        guard !hasTriggeredInitialProjectLoad else { return }
        guard isViewLoaded, view.window != nil else {
            NSLog("[ProjectVC] initial load waiting reason=%@ window=%@", reason, view.window != nil ? "attached" : "nil")
            return
        }
        let bounds = fullscreenBounds()
        guard bounds.width > 0, bounds.height > 0 else {
            NSLog("[ProjectVC] initial load deferred reason=%@ bounds=%@", reason, NSCoder.string(for: bounds))
            pendingInitialLoadWorkItem?.cancel()
            let workItem = DispatchWorkItem { [weak self] in
                self?.triggerInitialProjectLoadIfNeeded(reason: "\\(reason)-retry")
            }
            pendingInitialLoadWorkItem = workItem
            DispatchQueue.main.async(execute: workItem)
            return
        }
        guard let lynxView else { return }
        hasTriggeredInitialProjectLoad = true
        pendingInitialLoadWorkItem?.cancel()
        pendingInitialLoadWorkItem = nil
        applyFullscreenLayout(to: lynxView)
        NSLog("[ProjectVC] initial project load reason=%@ bounds=%@ safe=%@", reason, NSCoder.string(for: bounds), NSCoder.string(for: view.safeAreaInsets))
        lynxView.loadTemplate(fromURL: "main.lynx.bundle", initData: DevServerPrefs.getProjectInitTemplateData())
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self, weak lynxView] in
            guard let self, let lynxView else { return }
            self.logViewport("project post-load", lynxView: lynxView)
            self.applyFullscreenLayout(to: lynxView)
            self.disableAutomaticInsetAdjustment()
        }
    }

    @objc private func handleProjectDevMenuGesture(_ gesture: UILongPressGestureRecognizer) {
        #if DEBUG
        if gesture.state == .began {
            showProjectDevMenu()
        }
        #endif
    }

    private func buildDevMenuView() -> LynxView {
        let size = fullscreenBounds().size
#if DEBUG
        let env = LynxEnv.sharedInstance()
        let previousDevtoolEnabled = env.devtoolEnabled
        env.devtoolEnabled = false
        defer { env.devtoolEnabled = previousDevtoolEnabled }
#endif
        let lv = LynxView { builder in
            let provider = DevTemplateProvider()
            builder.enableGenericResourceFetcher = .true
            builder.config = LynxConfig(provider: provider)
            builder.templateResourceFetcher = provider
            builder.genericResourceFetcher = provider
            builder.screenSize = size
            builder.fontScale = 1.0
        }
        lv.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        lv.insetsLayoutMarginsFromSafeArea = false
        lv.preservesSuperviewLayoutMargins = false
        lv.backgroundColor = .clear
        applyFullscreenLayout(to: lv)
        return lv
    }

    private func showProjectDevMenu() {
        #if DEBUG
        guard devMenuView == nil else { return }
        let lv = buildDevMenuView()
        view.addSubview(lv)
        DevClientModule.attachLynxView(lv)
        lv.loadTemplate(fromURL: "tamer-debug.lynx.bundle", initData: nil)
        devMenuView = lv
        #endif
    }

    private func dismissProjectDevMenu() {
        DevClientModule.attachLynxView(lynxView)
        devMenuView?.removeFromSuperview()
        devMenuView = nil
    }

    private func closeProjectView() {
        dismissProjectDevMenu()
        dismiss(animated: true)
    }

    private func applyFullscreenLayout(to lynxView: LynxView) {
        let bounds = fullscreenBounds()
        let size = bounds.size
        lynxView.frame = bounds
        lynxView.updateScreenMetrics(withWidth: size.width, height: size.height)
        lynxView.updateViewport(withPreferredLayoutWidth: size.width, preferredLayoutHeight: size.height, needLayout: true)
        lynxView.preferredLayoutWidth = size.width
        lynxView.preferredLayoutHeight = size.height
        lynxView.layoutWidthMode = .exact
        lynxView.layoutHeightMode = .exact
        logViewport("project apply", lynxView: lynxView)
    }

    private func fullscreenBounds() -> CGRect {
        let bounds = view.bounds
        if bounds.width > 0, bounds.height > 0 {
            return bounds
        }
        return UIScreen.main.bounds
    }

    private func disableAutomaticInsetAdjustment() {
        guard let lynxView else { return }
        disableAutomaticInsetAdjustment(in: lynxView)
    }

    private func disableAutomaticInsetAdjustment(in view: UIView) {
        if let scrollView = view as? UIScrollView {
            scrollView.contentInsetAdjustmentBehavior = .never
            scrollView.contentInset = .zero
            scrollView.scrollIndicatorInsets = .zero
            if #available(iOS 13.0, *) {
                scrollView.automaticallyAdjustsScrollIndicatorInsets = false
            }
        }
        view.insetsLayoutMarginsFromSafeArea = false
        view.preservesSuperviewLayoutMargins = false
        for subview in view.subviews {
            disableAutomaticInsetAdjustment(in: subview)
        }
    }

    private func logViewport(_ label: String, lynxView: LynxView) {
        let rootWidth = lynxView.rootWidth()
        let rootHeight = lynxView.rootHeight()
        let intrinsic = lynxView.intrinsicContentSize
        NSLog("[ProjectVC] %@ view=%@ safe=%@ lynxFrame=%@ lynxBounds=%@ root=%0.2fx%0.2f intrinsic=%@", label, NSCoder.string(for: view.bounds), NSCoder.string(for: view.safeAreaInsets), NSCoder.string(for: lynxView.frame), NSCoder.string(for: lynxView.bounds), rootWidth, rootHeight, NSCoder.string(for: intrinsic))
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        NSLog("[ProjectVC] viewWillDisappear dismissed=%@ moving=%@", isBeingDismissed ? "true" : "false", isMovingFromParent ? "true" : "false")
        // Do not tear down the root host when presenting child native controllers such as the
        // @tamer-navigation UINavigationController. The coordinator LynxView must remain attached
        // while a pushed native stack is visible so spoke->root events and updates still work.
        guard isBeingDismissed || isMovingFromParent else { return }
        dismissProjectDevMenu()
        devClientManager?.disconnect()
        TamerRelogLogService.disconnect()
#if canImport(tamerrouter)
        TamerRouterNativeModule.attachHostView(nil)
#endif
        TamerInsetsModule.attachHostView(nil)
#if canImport(tamernavigation)
        TamerNavHost.attachRoot(nil, presenter: self)
#endif
#if DEBUG
        DevClientModule.dismissTamerDebugPanelHandler = previousDismissTamerDebugPanelHandler
#endif
    }

    override func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
        guard isBeingDismissed || isMovingFromParent else { return }
        pendingInitialLoadWorkItem?.cancel()
        pendingInitialLoadWorkItem = nil
        DevClientModule.attachLynxView(nil)
        onDismiss?()
    }
}
`;
}

function getDevTemplateProviderSwift(): string {
    return `import Foundation
import Lynx
import tamerdevclient

class DevTemplateProvider: NSObject, LynxTemplateProvider, LynxTemplateResourceFetcher, LynxGenericResourceFetcher {
    private static let devClientBundle = "dev-client.lynx.bundle"
    private static let tamerDebugBundle = "tamer-debug.lynx.bundle"

    func loadTemplate(withUrl url: String!, onComplete callback: LynxTemplateLoadBlock!) {
        DispatchQueue.global(qos: .background).async {
            if url == Self.tamerDebugBundle || url?.hasSuffix("/" + Self.tamerDebugBundle) == true {
                self.loadFromBundle(url: Self.tamerDebugBundle, callback: callback)
                return
            }
            // dev-client.lynx.bundle always loads from the embedded asset
            if url == Self.devClientBundle || url?.hasSuffix("/" + Self.devClientBundle) == true {
                self.loadFromBundle(url: Self.devClientBundle, callback: callback)
                return
            }

            if let devUrl = DevServerPrefs.getUrl(), !devUrl.isEmpty {
                let origin: String
                if let parsed = URL(string: devUrl) {
                    let scheme = parsed.scheme ?? "http"
                    let host = parsed.host ?? "localhost"
                    let port = parsed.port.map { ":\\($0)" } ?? ""
                    origin = "\\(scheme)://\\(host)\\(port)"
                } else {
                    origin = devUrl
                }

                let candidates = ["/\\(url!)", "/example/\\(url!)"]
                for candidate in candidates {
                    if let data = self.httpFetch(url: origin + candidate) {
                        callback?(data, nil)
                        return
                    }
                }
            }

            // Fall back to embedded bundle
            self.loadFromBundle(url: url, callback: callback)
        }
    }

    func fetchTemplate(_ request: LynxResourceRequest, onComplete callback: @escaping LynxTemplateResourceCompletionBlock) {
        DispatchQueue.global(qos: .background).async {
            let result = self.loadData(url: request.url)
            callback(result.data.map { LynxTemplateResource(nsData: $0) }, result.error)
        }
    }

    func fetchSSRData(_ request: LynxResourceRequest, onComplete callback: @escaping LynxSSRResourceCompletionBlock) {
        DispatchQueue.global(qos: .background).async {
            let result = self.loadData(url: request.url)
            callback(result.data, result.error)
        }
    }

    func fetchResource(_ request: LynxResourceRequest, onComplete callback: @escaping LynxGenericResourceCompletionBlock) -> (() -> Void) {
        DispatchQueue.global(qos: .background).async {
            let result = self.loadData(url: request.url)
            callback(result.data, result.error)
        }
        return {}
    }

    func fetchResourcePath(_ request: LynxResourceRequest, onComplete callback: @escaping LynxGenericResourcePathCompletionBlock) -> (() -> Void) {
        let error = NSError(domain: "DevTemplateProvider", code: 501,
                            userInfo: [NSLocalizedDescriptionKey: "Resource path lookup is not supported"])
        callback(nil, error)
        return {}
    }

    private func loadData(url: String?) -> (data: Data?, error: NSError?) {
        if url == Self.tamerDebugBundle || url?.hasSuffix("/" + Self.tamerDebugBundle) == true || url?.contains(Self.tamerDebugBundle) == true {
            return loadFromBundle(url: Self.tamerDebugBundle)
        }
        if url == Self.devClientBundle || url?.hasSuffix("/" + Self.devClientBundle) == true || url?.contains(Self.devClientBundle) == true {
            return loadFromBundle(url: Self.devClientBundle)
        }
        if let data = loadFromDevServer(url: url) {
            return (data, nil)
        }
        return loadFromBundle(url: url)
    }

    private func loadFromBundle(url: String?, callback: LynxTemplateLoadBlock!) {
        let result = loadFromBundle(url: url)
        callback?(result.data, result.error)
    }

    private func loadFromBundle(url: String?) -> (data: Data?, error: NSError?) {
        guard let normalized = normalizeBundlePath(url),
              let resourcePath = Bundle.main.resourcePath else {
            let err = NSError(domain: "DevTemplateProvider", code: 404,
                              userInfo: [NSLocalizedDescriptionKey: "Bundle not found: \\(url ?? "nil")"])
            return (nil, err)
        }
        let abs = (resourcePath as NSString).appendingPathComponent(normalized)
        guard FileManager.default.fileExists(atPath: abs),
              let data = try? Data(contentsOf: URL(fileURLWithPath: abs)) else {
            let err = NSError(domain: "DevTemplateProvider", code: 404,
                              userInfo: [NSLocalizedDescriptionKey: "Bundle not found: \\(normalized)"])
            return (nil, err)
        }
        return (data, nil)
    }

    private func loadFromDevServer(url: String?) -> Data? {
        guard let normalized = normalizeBundlePath(url),
              let devUrl = DevServerPrefs.getUrl(),
              !devUrl.isEmpty else { return nil }

        let origin: String
        let configuredPath: String
        if let parsed = URL(string: devUrl) {
            let scheme = parsed.scheme ?? "http"
            let host = parsed.host ?? "localhost"
            let port = parsed.port.map { ":\\($0)" } ?? ""
            origin = "\\(scheme)://\\(host)\\(port)"
            configuredPath = parsed.path.replacingOccurrences(of: "/+$", with: "", options: .regularExpression)
        } else {
            origin = devUrl
            configuredPath = ""
        }

        var candidates: [String] = []
        if !configuredPath.isEmpty {
            candidates.append("\\(configuredPath)/\\(normalized)")
        }
        candidates.append("/example/\\(normalized)")
        candidates.append("/\\(normalized)")
        for candidate in candidates {
            if let data = self.httpFetch(url: origin + candidate) {
                return data
            }
        }
        return nil
    }

    private func normalizeBundlePath(_ url: String?) -> String? {
        guard var s = url?.trimmingCharacters(in: .whitespacesAndNewlines), !s.isEmpty else { return nil }
        if let fragment = s.firstIndex(of: "#") {
            s = String(s[..<fragment])
        }
        if let query = s.firstIndex(of: "?") {
            s = String(s[..<query])
        }
        if let parsed = URL(string: s), parsed.scheme != nil, !parsed.path.isEmpty {
            s = parsed.path
        }
        s = s.replacingOccurrences(of: "\\\\", with: "/")
        while s.hasPrefix("/") {
            s.removeFirst()
        }
        s = stripBeforeMarker(s, marker: ".lynx.bundle/")
        s = stripBeforeMarker(s, marker: ".web.bundle/")
        s = stripBeforeMarker(s, marker: "static/")
        s = stripBeforeMarker(s, marker: "assets/")
        s = stripBeforeMarker(s, marker: "tamer-assets.json")
        let normalized = (s as NSString).standardizingPath
        if normalized == ".." || normalized.hasPrefix("../") { return nil }
        return normalized
    }

    private func stripBeforeMarker(_ value: String, marker: String) -> String {
        guard let range = value.range(of: marker) else { return value }
        if range.lowerBound == value.startIndex { return value }
        if marker.hasSuffix("/") {
            return String(value[range.upperBound...])
        }
        return String(value[range.lowerBound...])
    }

    private func httpFetch(url: String) -> Data? {
        guard let u = URL(string: url) else { return nil }
        var req = URLRequest(url: u)
        req.timeoutInterval = 10
        var result: Data?
        let sem = DispatchSemaphore(value: 0)
        URLSession.shared.dataTask(with: req) { data, response, _ in
            if let http = response as? HTTPURLResponse, http.statusCode == 200 {
                result = data
            }
            sem.signal()
        }.resume()
        sem.wait()
        return result
    }
}
`;
}

function getDevClientManagerSwift(): string {
    return `import Foundation
import tamerdevclient

class DevClientManager {
    private var webSocketTask: URLSessionWebSocketTask?
    private let onReload: () -> Void
    private var session: URLSession?
    private var shouldReconnect = false
    private var reconnectWorkItem: DispatchWorkItem?
    private let bundleUrl: String?
    private var hasSuccessfullyConnected = false

    private let reconnectDelay: TimeInterval = 3.0

    init(bundleUrl: String? = nil, onReload: @escaping () -> Void) {
        self.bundleUrl = bundleUrl
        self.onReload = onReload
    }

    func connect() {
        shouldReconnect = true
        if let bundleUrl = bundleUrl, !bundleUrl.isEmpty {
            DevServerPrefs.setUrl(bundleUrl)
        }
        openSocketIfNeeded()
    }

    private func openSocketIfNeeded() {
        guard shouldReconnect else { return }
        guard webSocketTask == nil else { return }
        guard let devUrl = DevServerPrefs.getUrl(), !devUrl.isEmpty else { return }
        guard let base = URL(string: devUrl) else { return }

        let scheme = (base.scheme == "https") ? "wss" : "ws"
        let host = base.host ?? "localhost"
        let port = base.port.map { ":\\($0)" } ?? ""
        let rawPath = base.path.isEmpty ? "/" : base.path
        let dir = rawPath.hasSuffix("/") ? rawPath : rawPath + "/"
        guard let wsUrl = URL(string: "\\(scheme)://\\(host)\\(port)\\(dir)__hmr") else { return }

        session = URLSession(configuration: .default)
        let task = session!.webSocketTask(with: wsUrl)
        webSocketTask = task
        task.resume()
        receive()
    }

    private func receive() {
        webSocketTask?.receive { [weak self] result in
            guard let self = self else { return }
            switch result {
            case .success(let msg):
                if case .string(let text) = msg, text.contains("\\"type\\":\\"reload\\"") {
                    DispatchQueue.main.async { self.onReload() }
                }
                self.receive()
            case .failure:
                self.handleDisconnect()
            }
        }
    }

    private func handleDisconnect() {
        webSocketTask = nil
        session?.invalidateAndCancel()
        session = nil
        guard shouldReconnect else { return }
        reconnectWorkItem?.cancel()
        let work = DispatchWorkItem { [weak self] in
            self?.openSocketIfNeeded()
        }
        reconnectWorkItem = work
        DispatchQueue.main.asyncAfter(deadline: .now() + reconnectDelay, execute: work)
    }

    func disconnect() {
        shouldReconnect = false
        reconnectWorkItem?.cancel()
        reconnectWorkItem = nil
        webSocketTask?.cancel(with: .goingAway, reason: nil)
        webSocketTask = nil
        session?.invalidateAndCancel()
        session = nil
    }
}
`;
}

function getLynxPushViewControllerSwift(): string {
    return `import UIKit
import Lynx
import tamerdevclient
#if canImport(tamerinsets)
import tamerinsets
#endif
#if canImport(tamerrouter)
import tamerrouter
#endif
#if canImport(tamerlinking)
import tamerlinking
#endif

/// Presents a Lynx bundle loaded from a URL-scheme deep link or an openProjectDirect call.
/// Equivalent to Android's LynxPushActivity — receives bundleUrl + optional initData,
/// loads a full-screen LynxView, and dismisses on back/swipe.
class LynxPushViewController: UIViewController {
    private let bundleUrl: String
    private let initDataJson: String
    private var lynxView: LynxView?

    init(bundleUrl: String, initDataJson: String = "") {
        self.bundleUrl = bundleUrl
        self.initDataJson = initDataJson
        super.init(nibName: nil, bundle: nil)
        modalPresentationStyle = .fullScreen
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) not supported") }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        edgesForExtendedLayout = .all
        extendedLayoutIncludesOpaqueBars = true
        additionalSafeAreaInsets = .zero
        view.insetsLayoutMarginsFromSafeArea = false
        view.preservesSuperviewLayoutMargins = false
        if #available(iOS 15.0, *) {
            viewRespectsSystemMinimumLayoutMargins = false
        }
#if canImport(tamerlinking)
        if !bundleUrl.isEmpty {
            LinkingModule.setInitialUrl(bundleUrl)
        }
#endif
        setupLynxView()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        if let lv = lynxView { applyFullscreenLayout(to: lv) }
    }

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
#if canImport(tamerinsets)
        TamerInsetsModule.reRequestInsets()
#endif
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        guard isBeingDismissed || isMovingFromParent else { return }
#if canImport(tamerrouter)
        TamerRouterNativeModule.attachHostView(nil)
#endif
#if canImport(tamerinsets)
        TamerInsetsModule.attachHostView(nil)
#endif
        DevClientModule.attachLynxView(nil)
    }

    override func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
        guard isBeingDismissed || isMovingFromParent else { return }
        lynxView?.removeFromSuperview()
        lynxView = nil
    }

    private func setupLynxView() {
        let bounds = fullscreenBounds()
        let size = bounds.size
        let provider = DevTemplateProvider()
        let lv = LynxView { builder in
            builder.enableGenericResourceFetcher = .true
            builder.config = LynxConfig(provider: provider)
            builder.templateResourceFetcher = provider
            builder.genericResourceFetcher = provider
            builder.screenSize = size
            builder.fontScale = 1.0
        }
        lv.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        lv.insetsLayoutMarginsFromSafeArea = false
        lv.preservesSuperviewLayoutMargins = false
        view.addSubview(lv)
        applyFullscreenLayout(to: lv)
#if canImport(tamerinsets)
        TamerInsetsModule.attachHostView(lv)
#endif
#if canImport(tamerrouter)
        TamerRouterNativeModule.attachHostView(lv)
#endif
        DevClientModule.attachLynxView(lv)
        let initData = initDataJson.isEmpty ? nil : LynxTemplateData(json: initDataJson)
        lv.loadTemplate(fromURL: bundleUrl, initData: initData)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self, weak lv] in
            guard let self, let lv else { return }
            self.applyFullscreenLayout(to: lv)
        }
        self.lynxView = lv
    }

    private func applyFullscreenLayout(to lv: LynxView) {
        let bounds = fullscreenBounds()
        let size = bounds.size
        lv.frame = bounds
        lv.updateScreenMetrics(withWidth: size.width, height: size.height)
        lv.updateViewport(withPreferredLayoutWidth: size.width, preferredLayoutHeight: size.height, needLayout: true)
        lv.preferredLayoutWidth = size.width
        lv.preferredLayoutHeight = size.height
        lv.layoutWidthMode = .exact
        lv.layoutHeightMode = .exact
    }

    private func fullscreenBounds() -> CGRect {
        let b = view.bounds
        if b.width > 0, b.height > 0 { return b }
        return UIScreen.main.bounds
    }
}
`;
}

function getQRScannerViewControllerSwift(): string {
    return `import UIKit
import AVFoundation

class QRScannerViewController: UIViewController {
    var onResult: ((String?) -> Void)?

    private var captureSession: AVCaptureSession?
    private var previewLayer: AVCaptureVideoPreviewLayer?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        setupCamera()
        addCancelButton()
    }

    private func setupCamera() {
        let session = AVCaptureSession()
        guard let device = AVCaptureDevice.default(for: .video),
              let input = try? AVCaptureDeviceInput(device: device) else {
            onResult?(nil)
            return
        }

        let output = AVCaptureMetadataOutput()
        session.addInput(input)
        session.addOutput(output)
        output.setMetadataObjectsDelegate(self, queue: .main)
        output.metadataObjectTypes = [.qr]

        let preview = AVCaptureVideoPreviewLayer(session: session)
        preview.frame = view.layer.bounds
        preview.videoGravity = .resizeAspectFill
        view.layer.insertSublayer(preview, at: 0)
        previewLayer = preview

        DispatchQueue.global(qos: .userInitiated).async { session.startRunning() }
        captureSession = session
    }

    private func addCancelButton() {
        let btn = UIButton(type: .system)
        btn.setTitle("Cancel", for: .normal)
        btn.setTitleColor(.white, for: .normal)
        btn.titleLabel?.font = .systemFont(ofSize: 18, weight: .medium)
        btn.addTarget(self, action: #selector(cancel), for: .touchUpInside)
        btn.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(btn)
        NSLayoutConstraint.activate([
            btn.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            btn.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor, constant: -24),
        ])
    }

    @objc private func cancel() {
        captureSession?.stopRunning()
        onResult?(nil)
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        if captureSession?.isRunning == false {
            DispatchQueue.global(qos: .userInitiated).async { self.captureSession?.startRunning() }
        }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        captureSession?.stopRunning()
    }
}

extension QRScannerViewController: AVCaptureMetadataOutputObjectsDelegate {
    func metadataOutput(_ output: AVCaptureMetadataOutput,
                        didOutput objects: [AVMetadataObject],
                        from connection: AVCaptureConnection) {
        captureSession?.stopRunning()
        if let obj = objects.first as? AVMetadataMachineReadableCodeObject,
           let value = obj.stringValue {
            onResult?(value)
        }
    }
}
`;
}

function getLynxInitProcessorSwift(): string {
    return `// Copyright 2024 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import Foundation
import UIKit

// GENERATED IMPORTS START
// This section is automatically generated by Tamer4Lynx.
// Manual edits will be overwritten.
// GENERATED IMPORTS END

final class LynxInitProcessor {
    static let shared = LynxInitProcessor()
    private init() {}

    func setupEnvironment() {
        TamerIconElement.registerFonts()
        setupLynxEnv()
        setupLynxService()
    }

    private func setupLynxEnv() {
        let env = LynxEnv.sharedInstance()
#if DEBUG
#if canImport(tamerdevclient)
        if TamerLynxDevToolPolicy.attachDevToolWithInitialLynxSetup {
            env.lynxDebugEnabled = true
            env.logBoxEnabled = true
        }
#else
        env.lynxDebugEnabled = true
        env.logBoxEnabled = true
#endif
#endif
        let globalConfig = LynxConfig(provider: env.config.templateProvider)

        // GENERATED AUTOLINK START

        // GENERATED AUTOLINK END

        env.prepareConfig(globalConfig)
    }

    private func setupLynxService() {
        let webPCoder = SDImageWebPCoder.shared
        SDImageCodersManager.shared.addCoder(webPCoder)
    }
}
`;
}

function getBridgingHeader(): string {
    return `#import <Lynx/LynxConfig.h>
#import <Lynx/LynxEnv.h>
#import <Lynx/LynxTemplateProvider.h>
#import <Lynx/LynxView.h>
#import <Lynx/LynxModule.h>
#import <SDWebImage/SDWebImage.h>
#import <SDWebImageWebPCoder/SDWebImageWebPCoder.h>
`;
}

function getInfoPlist(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDevelopmentRegion</key>
	<string>$(DEVELOPMENT_LANGUAGE)</string>
	<key>CFBundleExecutable</key>
	<string>$(EXECUTABLE_NAME)</string>
	<key>CFBundleIdentifier</key>
	<string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
	<key>CFBundleInfoDictionaryVersion</key>
	<string>6.0</string>
	<key>CFBundleDisplayName</key>
	<string>Tamer App</string>
	<key>CFBundleName</key>
	<string>$(PRODUCT_NAME)</string>
	<key>CFBundlePackageType</key>
	<string>APPL</string>
	<key>CFBundleShortVersionString</key>
	<string>1.0</string>
	<key>CFBundleVersion</key>
	<string>1</string>
	<key>UILaunchStoryboardName</key>
	<string>LaunchScreen</string>
	<key>CFBundleURLTypes</key>
	<array>
		<dict>
			<key>CFBundleURLSchemes</key>
			<array>
				<string>tamerdevapp</string>
			</array>
		</dict>
	</array>
	<key>NSCameraUsageDescription</key>
	<string>Used to scan QR codes for connecting to the dev server</string>
	<key>NSLocalNetworkUsageDescription</key>
	<string>Used to discover Tamer dev servers on your local network</string>
	<key>NSBonjourServices</key>
	<array>
		<string>_tamer._tcp.</string>
	</array>
	<key>NSAppTransportSecurity</key>
	<dict>
		<key>NSAllowsArbitraryLoads</key>
		<true/>
	</dict>
	<key>UIRequiredDeviceCapabilities</key>
	<array>
		<string>armv7</string>
	</array>
	<key>UISupportedInterfaceOrientations</key>
	<array>
		<string>UIInterfaceOrientationPortrait</string>
		<string>UIInterfaceOrientationLandscapeLeft</string>
		<string>UIInterfaceOrientationLandscapeRight</string>
	</array>
</dict>
</plist>
`;
}

function getPodfile(): string {
    return `source 'https://cdn.cocoapods.org/'

install! 'cocoapods', :incremental_installation => true, :generate_multiple_pod_projects => true

platform :ios, '14.0'

target '${APP_NAME}' do
  pod 'Lynx', '3.6.0', :subspecs => [
    'Framework',
  ], :modular_headers => true

  pod 'PrimJS', '3.6.1', :subspecs => ['quickjs', 'napi']

  pod 'LynxService', '3.6.0', :subspecs => [
    'Image',
    'Log',
    'Http',
    'Devtool',
  ]
  pod 'LynxDevtool', '3.6.0'
  pod 'SDWebImage','5.15.5'
  pod 'SDWebImageWebPCoder', '0.11.0'

  # GENERATED AUTOLINK DEPENDENCIES START
  # This section is automatically generated by Tamer4Lynx.
  # Manual edits will be overwritten.
  # GENERATED AUTOLINK DEPENDENCIES END
end

post_install do |installer|
  # generate_multiple_pod_projects => true: pods_project may be nil; use generated_projects (CocoaPods 1.8+).
  pod_xcode_projects = if installer.pods_project
    [installer.pods_project]
  elsif installer.respond_to?(:generated_projects) && !installer.generated_projects.empty?
    installer.generated_projects
  else
    []
  end
  pod_xcode_projects.each do |project|
    project.targets.each do |target|
      target.build_configurations.each do |config|
        config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'gnu++17'
        config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '14.0'
        config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
        config.build_settings['SWIFT_ENABLE_EXPLICIT_MODULES'] = 'NO'
        config.build_settings['ONLY_ACTIVE_ARCH'] = 'YES'
${PODFILE_POST_INSTALL_BUILD_SPEED_RUBY}
      end

      if target.name == 'Lynx'
        target.build_configurations.each do |config|
          flags = [
            '-Wno-vla-extension',
            '-Wno-vla',
            '-Wno-error=vla-extension',
            '-Wno-deprecated-declarations',
            '-Wno-deprecated',
            '-Wno-deprecated-implementations',
            '-Wno-macro-redefined',
            '-Wno-enum-compare',
            '-Wno-enum-compare-conditional',
            '-Wno-enum-conversion',
            '-Wno-error'
          ].join(' ')

          config.build_settings['OTHER_CPLUSPLUSFLAGS'] = "$(inherited) #{flags}"
          config.build_settings['OTHER_CFLAGS'] = "$(inherited) #{flags}"
          config.build_settings['CLANG_WARN_VLA'] = 'NO'
          config.build_settings['GCC_TREAT_WARNINGS_AS_ERRORS'] = 'NO'
          config.build_settings['CLANG_WARN_ENUM_CONVERSION'] = 'NO'
        end
      end
      if target.name == 'PrimJS'
        target.build_configurations.each do |config|
          config.build_settings['OTHER_CFLAGS'] = "$(inherited) -Wno-macro-redefined"
          config.build_settings['OTHER_CPLUSPLUSFLAGS'] = "$(inherited) -Wno-macro-redefined"
        end
      end
    end
  end
  Dir.glob(File.join(installer.sandbox.root, 'Target Support Files', 'Lynx', '*.xcconfig')).each do |xcconfig_path|
    next unless File.file?(xcconfig_path)
    content = File.read(xcconfig_path)
    next unless content.include?('-Werror')
    File.write(xcconfig_path, content.gsub('-Werror', ''))
  end
  Dir.glob(File.join(installer.sandbox.root, 'Lynx/platform/darwin/**/*.{m,mm}')).each do |lynx_source|
    next unless File.file?(lynx_source)
    content = File.read(lynx_source)
    next unless content.match?(/\\btypeof\\(/)
    File.chmod(0644, lynx_source) rescue nil
    File.write(lynx_source, content.gsub(/\\btypeof\\(/, '__typeof__('))
  end
end
`;
}

function getMainStoryboard(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<document type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB" version="3.0"
    toolsVersion="13122.16" targetRuntime="iOS.CocoaTouch" propertyAccessControl="none"
    useAutolayout="YES" useTraitCollections="YES" useSafeAreas="YES" colorMatched="YES"
    initialViewController="BYZ-38-t0r">
  <dependencies>
    <plugIn identifier="com.apple.InterfaceBuilder.IBCocoaTouchPlugin" version="13104.12"/>
    <capability name="Safe area layout guides" minToolsVersion="9.0"/>
  </dependencies>
  <scenes>
    <scene sceneID="tne-QT-ifu">
      <objects>
        <viewController id="BYZ-38-t0r" customClass="DevLauncherViewController"
            customModuleProvider="target" sceneMemberID="viewController">
          <view key="view" contentMode="scaleToFill" id="8bC-Xf-vdC">
            <rect key="frame" x="0.0" y="0.0" width="390" height="844"/>
            <autoresizingMask key="autoresizingMask" widthSizable="YES" heightSizable="YES"/>
            <color key="backgroundColor" systemColor="systemBackgroundColor"/>
            <viewLayoutGuide key="safeArea" id="6Tk-OE-BBY"/>
          </view>
        </viewController>
        <placeholder placeholderIdentifier="IBFirstResponder" id="dkx-z0-nzr"
            sceneMemberID="firstResponder"/>
      </objects>
    </scene>
  </scenes>
</document>
`;
}

function getLaunchScreenStoryboard(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<document type="com.apple.InterfaceBuilder3.CocoaTouch.Storyboard.XIB" version="3.0"
    toolsVersion="13122.16" targetRuntime="iOS.CocoaTouch" propertyAccessControl="none"
    useAutolayout="YES" launchScreen="YES" useTraitCollections="YES" useSafeAreas="YES"
    colorMatched="YES" initialViewController="01J-lp-oVM">
  <device id="retina6_12" orientation="portrait" appearance="light"/>
  <dependencies>
    <plugIn identifier="com.apple.InterfaceBuilder.IBCocoaTouchPlugin" version="13104.12"/>
    <capability name="Safe area layout guides" minToolsVersion="9.0"/>
    <capability name="documents saved in the Xcode 8 format" minToolsVersion="8.0"/>
  </dependencies>
  <scenes>
    <scene sceneID="EHf-IW-A2E">
      <objects>
        <viewController id="01J-lp-oVM" sceneMemberID="viewController">
          <view key="view" contentMode="scaleToFill" id="Ze5-6b-2t3">
            <rect key="frame" x="0.0" y="0.0" width="390" height="844"/>
            <autoresizingMask key="autoresizingMask" widthSizable="YES" heightSizable="YES"/>
            <subviews>
              <view contentMode="scaleToFill" translatesAutoresizingMaskIntoConstraints="NO" id="Bg9-1M-mhb">
                <rect key="frame" x="0.0" y="0.0" width="390" height="844"/>
                <color key="backgroundColor" white="0.0" alpha="1" colorSpace="custom" customColorSpace="genericGamma22GrayColorSpace"/>
              </view>
            </subviews>
            <viewLayoutGuide key="safeArea" id="Bcu-3y-fUS"/>
            <color key="backgroundColor" white="0.0" alpha="1" colorSpace="custom" customColorSpace="genericGamma22GrayColorSpace"/>
            <constraints>
              <constraint firstItem="Bg9-1M-mhb" firstAttribute="top" secondItem="Ze5-6b-2t3" secondAttribute="top" id="3M4-v9-a3l"/>
              <constraint firstItem="Bg9-1M-mhb" firstAttribute="bottom" secondItem="Ze5-6b-2t3" secondAttribute="bottom" id="Sbc-LM-HvA"/>
              <constraint firstItem="Bg9-1M-mhb" firstAttribute="leading" secondItem="Ze5-6b-2t3" secondAttribute="leading" id="cJ0-4h-f4M"/>
              <constraint firstAttribute="trailing" secondItem="Bg9-1M-mhb" secondAttribute="trailing" id="g0s-pf-rxW"/>
            </constraints>
          </view>
        </viewController>
        <placeholder placeholderIdentifier="IBFirstResponder" id="iYj-Kq-Ea1" userLabel="First Responder" sceneMemberID="firstResponder"/>
      </objects>
    </scene>
  </scenes>
</document>
`;
}

function generatePbxproj(ids: Record<string, string>): string {
    const srcRoot = '${SRCROOT}';
    const builtProductsDir = '${BUILT_PRODUCTS_DIR}';
    const productName = '${PRODUCT_NAME}';
    return `// !$*UTF8*$!
{
	archiveVersion = 1;
	classes = {};
	objectVersion = 56;
	objects = {
/* Begin PBXBuildFile section */
		${ids.appDelegateBuildFile} /* AppDelegate.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${ids.appDelegateRef}; };
		${ids.devLauncherBuildFile} /* DevLauncherViewController.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${ids.devLauncherRef}; };
		${ids.projectVCBuildFile} /* ProjectViewController.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${ids.projectVCRef}; };
		${ids.templateProviderBuildFile} /* DevTemplateProvider.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${ids.templateProviderRef}; };
		${ids.devClientManagerBuildFile} /* DevClientManager.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${ids.devClientManagerRef}; };
		${ids.devServerPrefsBuildFile} /* DevServerPrefs in Sources (via DevClientModule) */ = {isa = PBXBuildFile; fileRef = ${ids.devClientModuleRef}; };
		${ids.qrScannerBuildFile} /* QRScannerViewController.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${ids.qrScannerRef}; };
		${ids.lynxInitBuildFile} /* LynxInitProcessor.swift in Sources */ = {isa = PBXBuildFile; fileRef = ${ids.lynxInitRef}; };
		${ids.mainStoryboardBuildFile} /* Base in Resources */ = {isa = PBXBuildFile; fileRef = ${ids.mainStoryboardBaseRef}; };
		${ids.launchStoryboardBuildFile} /* Base in Resources */ = {isa = PBXBuildFile; fileRef = ${ids.launchStoryboardBaseRef}; };
		${ids.assetsBuildFile} /* Assets.xcassets in Resources */ = {isa = PBXBuildFile; fileRef = ${ids.assetsRef}; };
		${ids.bundleBuildFile} /* dev-client.lynx.bundle in Resources */ = {isa = PBXBuildFile; fileRef = ${ids.bundleRef}; };
/* End PBXBuildFile section */

/* Begin PBXFileReference section */
		${ids.appFile} /* ${APP_NAME}.app */ = {isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = "${APP_NAME}.app"; sourceTree = BUILT_PRODUCTS_DIR; };
		${ids.appDelegateRef} /* AppDelegate.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "AppDelegate.swift"; sourceTree = "<group>"; };
		${ids.devLauncherRef} /* DevLauncherViewController.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "DevLauncherViewController.swift"; sourceTree = "<group>"; };
		${ids.projectVCRef} /* ProjectViewController.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "ProjectViewController.swift"; sourceTree = "<group>"; };
		${ids.templateProviderRef} /* DevTemplateProvider.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "DevTemplateProvider.swift"; sourceTree = "<group>"; };
		${ids.devClientManagerRef} /* DevClientManager.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "DevClientManager.swift"; sourceTree = "<group>"; };
		${ids.devClientModuleRef} /* DevClientModule (via pod) */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "DevClientModule.swift"; sourceTree = "<group>"; };
		${ids.qrScannerRef} /* QRScannerViewController.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "QRScannerViewController.swift"; sourceTree = "<group>"; };
		${ids.lynxInitRef} /* LynxInitProcessor.swift */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.swift; path = "LynxInitProcessor.swift"; sourceTree = "<group>"; };
		${ids.bridgingHeaderRef} /* ${BRIDGING_HEADER} */ = {isa = PBXFileReference; lastKnownFileType = sourcecode.c.h; path = "${BRIDGING_HEADER}"; sourceTree = "<group>"; };
		${ids.mainStoryboardBaseRef} /* Base */ = {isa = PBXFileReference; lastKnownFileType = file.storyboard; name = Base; path = "Base.lproj/Main.storyboard"; sourceTree = "<group>"; };
		${ids.launchStoryboardBaseRef} /* Base */ = {isa = PBXFileReference; lastKnownFileType = file.storyboard; name = Base; path = "Base.lproj/LaunchScreen.storyboard"; sourceTree = "<group>"; };
		${ids.assetsRef} /* Assets.xcassets */ = {isa = PBXFileReference; lastKnownFileType = folder.assetcatalog; path = "Assets.xcassets"; sourceTree = "<group>"; };
		${ids.bundleRef} /* dev-client.lynx.bundle */ = {isa = PBXFileReference; lastKnownFileType = "file"; path = "dev-client.lynx.bundle"; sourceTree = "<group>"; };
/* End PBXFileReference section */

/* Begin PBXFrameworksBuildPhase section */
		${ids.frameworksBuildPhase} /* Frameworks */ = {
			isa = PBXFrameworksBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXFrameworksBuildPhase section */

/* Begin PBXGroup section */
		${ids.mainGroup} = {
			isa = PBXGroup;
			children = (
				${ids.appGroup} /* ${APP_NAME} */,
				${ids.productsGroup} /* Products */,
				${ids.frameworksGroup} /* Frameworks */,
			);
			sourceTree = "<group>";
		};
		${ids.productsGroup} /* Products */ = {
			isa = PBXGroup;
			children = (
				${ids.appFile} /* ${APP_NAME}.app */,
			);
			name = Products;
			sourceTree = "<group>";
		};
		${ids.frameworksGroup} /* Frameworks */ = {
			isa = PBXGroup;
			children = (
			);
			name = Frameworks;
			sourceTree = "<group>";
		};
		${ids.appGroup} /* ${APP_NAME} */ = {
			isa = PBXGroup;
			children = (
				${ids.appDelegateRef} /* AppDelegate.swift */,
				${ids.devLauncherRef} /* DevLauncherViewController.swift */,
				${ids.projectVCRef} /* ProjectViewController.swift */,
				${ids.templateProviderRef} /* DevTemplateProvider.swift */,
				${ids.devClientManagerRef} /* DevClientManager.swift */,
				${ids.devClientModuleRef} /* DevClientModule.swift */,
				${ids.qrScannerRef} /* QRScannerViewController.swift */,
				${ids.lynxInitRef} /* LynxInitProcessor.swift */,
				${ids.bridgingHeaderRef} /* ${BRIDGING_HEADER} */,
				${ids.mainStoryboardRef} /* Main.storyboard */,
				${ids.launchStoryboardRef} /* LaunchScreen.storyboard */,
				${ids.assetsRef} /* Assets.xcassets */,
				${ids.bundleRef} /* dev-client.lynx.bundle */,
			);
			path = "${APP_NAME}";
			sourceTree = "<group>";
		};
/* End PBXGroup section */

/* Begin PBXNativeTarget section */
		${ids.nativeTarget} /* ${APP_NAME} */ = {
			isa = PBXNativeTarget;
			buildConfigurationList = ${ids.targetBuildConfigList};
			buildPhases = (
				${ids.sourcesBuildPhase} /* Sources */,
				${ids.frameworksBuildPhase} /* Frameworks */,
				${ids.resourcesBuildPhase} /* Resources */,
				${ids.fontCopyScriptPhase} /* [Tamer] Copy Icon Fonts */,
			);
			buildRules = (
			);
			dependencies = (
			);
			name = "${APP_NAME}";
			productName = "${APP_NAME}";
			productReference = ${ids.appFile};
			productType = "com.apple.product-type.application";
		};
/* End PBXNativeTarget section */

/* Begin PBXProject section */
		${ids.project} /* Project object */ = {
			isa = PBXProject;
			attributes = {
				LastUpgradeCheck = 1530;
			};
			buildConfigurationList = ${ids.projectBuildConfigList};
			compatibilityVersion = "Xcode 14.0";
			developmentRegion = en;
			hasScannedForEncodings = 0;
			knownRegions = (
				en,
				Base,
			);
			mainGroup = ${ids.mainGroup};
			productRefGroup = ${ids.productsGroup} /* Products */;
			projectDirPath = "";
			projectRoot = "";
			targets = (
				${ids.nativeTarget} /* ${APP_NAME} */,
			);
		};
/* End PBXProject section */

/* Begin PBXResourcesBuildPhase section */
		${ids.resourcesBuildPhase} /* Resources */ = {
			isa = PBXResourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
				${ids.assetsBuildFile} /* Assets.xcassets in Resources */,
				${ids.mainStoryboardBuildFile} /* Base in Resources */,
				${ids.launchStoryboardBuildFile} /* Base in Resources */,
				${ids.bundleBuildFile} /* dev-client.lynx.bundle in Resources */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXResourcesBuildPhase section */

/* Begin PBXShellScriptBuildPhase section */
		${ids.fontCopyScriptPhase} /* [Tamer] Copy Icon Fonts */ = {
			isa = PBXShellScriptBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			inputPaths = (
			);
			name = "[Tamer] Copy Icon Fonts";
			outputPaths = (
			);
			runOnlyForDeploymentPostprocessing = 0;
			shellPath = /bin/sh;
			shellScript = "FONTS_SRC=\\"${srcRoot}/../../tamer-icons/fonts\\"\\nif [ -d \\"$FONTS_SRC\\" ]; then\\n  cp -f \\"$FONTS_SRC/MaterialSymbolsOutlined.ttf\\" \\"${builtProductsDir}/${productName}.app/\\" 2>/dev/null || true\\n  cp -f \\"$FONTS_SRC/fa-solid-900.ttf\\" \\"${builtProductsDir}/${productName}.app/\\" 2>/dev/null || true\\nfi\\nCP_SRC=\\"${srcRoot}/../../tamer-icons/android/src/main/assets/fonts/material-codepoints.txt\\"\\n[ -f \\"$CP_SRC\\" ] && cp -f \\"$CP_SRC\\" \\"${builtProductsDir}/${productName}.app/\\" 2>/dev/null || true\\n";
		};
/* End PBXShellScriptBuildPhase section */

/* Begin PBXSourcesBuildPhase section */
		${ids.sourcesBuildPhase} /* Sources */ = {
			isa = PBXSourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
				${ids.appDelegateBuildFile} /* AppDelegate.swift in Sources */,
				${ids.devLauncherBuildFile} /* DevLauncherViewController.swift in Sources */,
				${ids.projectVCBuildFile} /* ProjectViewController.swift in Sources */,
				${ids.templateProviderBuildFile} /* DevTemplateProvider.swift in Sources */,
				${ids.devClientManagerBuildFile} /* DevClientManager.swift in Sources */,
				${ids.qrScannerBuildFile} /* QRScannerViewController.swift in Sources */,
				${ids.lynxInitBuildFile} /* LynxInitProcessor.swift in Sources */,
			);
			runOnlyForDeploymentPostprocessing = 0;
		};
/* End PBXSourcesBuildPhase section */

/* Begin PBXVariantGroup section */
		${ids.mainStoryboardRef} /* Main.storyboard */ = {
			isa = PBXVariantGroup;
			children = (
				${ids.mainStoryboardBaseRef} /* Base */,
			);
			name = "Main.storyboard";
			sourceTree = "<group>";
		};
		${ids.launchStoryboardRef} /* LaunchScreen.storyboard */ = {
			isa = PBXVariantGroup;
			children = (
				${ids.launchStoryboardBaseRef} /* Base */,
			);
			name = "LaunchScreen.storyboard";
			sourceTree = "<group>";
		};
/* End PBXVariantGroup section */

/* Begin XCBuildConfiguration section */
		${ids.projectDebugConfig} /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ALWAYS_SEARCH_USER_PATHS = NO;
				CLANG_CXX_LANGUAGE_STANDARD = "gnu++17";
				CLANG_CXX_LIBRARY = "libc++";
				CLANG_ENABLE_MODULES = YES;
				CLANG_ENABLE_OBJC_ARC = YES;
				COPY_PHASE_STRIP = NO;
				DEBUG_INFORMATION_FORMAT = dwarf;
				GCC_C_LANGUAGE_STANDARD = gnu11;
				GCC_NO_COMMON_BLOCKS = YES;
				IPHONEOS_DEPLOYMENT_TARGET = 14.0;
				SDKROOT = iphoneos;
				SWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG;
				SWIFT_OPTIMIZATION_LEVEL = "-Onone";
				COMPILER_INDEX_STORE_ENABLE = NO;
				SWIFT_COMPILATION_MODE = incremental;
			};
			name = Debug;
		};
		${ids.projectReleaseConfig} /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ALWAYS_SEARCH_USER_PATHS = NO;
				CLANG_CXX_LANGUAGE_STANDARD = "gnu++17";
				CLANG_CXX_LIBRARY = "libc++";
				CLANG_ENABLE_MODULES = YES;
				CLANG_ENABLE_OBJC_ARC = YES;
				COPY_PHASE_STRIP = NO;
				DEBUG_INFORMATION_FORMAT = "dwarf-with-dsym";
				GCC_C_LANGUAGE_STANDARD = gnu11;
				GCC_NO_COMMON_BLOCKS = YES;
				IPHONEOS_DEPLOYMENT_TARGET = 14.0;
				SDKROOT = iphoneos;
				SWIFT_COMPILATION_MODE = wholemodule;
				SWIFT_OPTIMIZATION_LEVEL = "-O";
			};
			name = Release;
		};
		${ids.targetDebugConfig} /* Debug */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
				CURRENT_PROJECT_VERSION = 1;
				INFOPLIST_FILE = "${APP_NAME}/Info.plist";
				LD_RUNPATH_SEARCH_PATHS = "$(inherited) @executable_path/Frameworks";
				MARKETING_VERSION = "1.0";
				PRODUCT_BUNDLE_IDENTIFIER = "${BUNDLE_ID}";
				PRODUCT_NAME = "$(TARGET_NAME)";
				SWIFT_OBJC_BRIDGING_HEADER = "${APP_NAME}/${BRIDGING_HEADER}";
				SWIFT_VERSION = 5.0;
				TARGETED_DEVICE_FAMILY = "1,2";
			};
			name = Debug;
		};
		${ids.targetReleaseConfig} /* Release */ = {
			isa = XCBuildConfiguration;
			buildSettings = {
				ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
				CURRENT_PROJECT_VERSION = 1;
				INFOPLIST_FILE = "${APP_NAME}/Info.plist";
				LD_RUNPATH_SEARCH_PATHS = "$(inherited) @executable_path/Frameworks";
				MARKETING_VERSION = "1.0";
				PRODUCT_BUNDLE_IDENTIFIER = "${BUNDLE_ID}";
				PRODUCT_NAME = "$(TARGET_NAME)";
				SWIFT_OBJC_BRIDGING_HEADER = "${APP_NAME}/${BRIDGING_HEADER}";
				SWIFT_VERSION = 5.0;
				TARGETED_DEVICE_FAMILY = "1,2";
			};
			name = Release;
		};
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
		${ids.projectBuildConfigList} = {
			isa = XCConfigurationList;
			buildConfigurations = (
				${ids.projectDebugConfig} /* Debug */,
				${ids.projectReleaseConfig} /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
		${ids.targetBuildConfigList} = {
			isa = XCConfigurationList;
			buildConfigurations = (
				${ids.targetDebugConfig} /* Debug */,
				${ids.targetReleaseConfig} /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		};
/* End XCConfigurationList section */
	};
	rootObject = ${ids.project} /* Project object */;
}
`;
}

async function createDevAppProject(iosDir: string, repoRoot: string): Promise<void> {
    const projectDir = path.join(iosDir, APP_NAME);
    const xcodeprojDir = path.join(iosDir, `${APP_NAME}.xcodeproj`);

    if (fs.existsSync(iosDir)) {
        fs.rmSync(iosDir, { recursive: true, force: true });
    }
    console.log(`🚀 Creating TamerDevApp iOS project at: ${iosDir}`);

    const ids: Record<string, string> = {};
    const idKeys = [
        'project', 'mainGroup', 'appGroup', 'productsGroup', 'frameworksGroup',
        'appFile', 'appDelegateRef', 'devLauncherRef', 'projectVCRef',
        'templateProviderRef', 'devClientManagerRef', 'devClientModuleRef', 'qrScannerRef',
        'lynxInitRef', 'bridgingHeaderRef', 'mainStoryboardRef', 'mainStoryboardBaseRef',
        'launchStoryboardRef', 'launchStoryboardBaseRef', 'assetsRef', 'bundleRef', 'nativeTarget',
        'appDelegateBuildFile', 'devLauncherBuildFile', 'projectVCBuildFile',
        'templateProviderBuildFile', 'devClientManagerBuildFile', 'devServerPrefsBuildFile',
        'qrScannerBuildFile', 'lynxInitBuildFile', 'mainStoryboardBuildFile', 'launchStoryboardBuildFile',
        'assetsBuildFile', 'bundleBuildFile',
        'frameworksBuildPhase', 'resourcesBuildPhase', 'sourcesBuildPhase', 'fontCopyScriptPhase',
        'projectBuildConfigList', 'targetBuildConfigList',
        'projectDebugConfig', 'projectReleaseConfig', 'targetDebugConfig', 'targetReleaseConfig',
    ];
    for (const k of idKeys) ids[k] = generateId();

    writeFile(path.join(iosDir, 'Podfile'), getPodfile());
    writeFile(path.join(projectDir, 'AppDelegate.swift'), getAppDelegateSwift());

    const devClientPkg = findDevClientPackage(repoRoot);
    const templateDir = devClientPkg ? path.join(devClientPkg, 'ios', 'templates') : null;
    const templateVars = { PROJECT_BUNDLE_SEGMENT: 'tamer-dev-app' };
    const templateFiles = [
        'DevLauncherViewController.swift',
        'ProjectViewController.swift',
        'LynxPushViewController.swift',
        'DevTemplateProvider.swift',
        'DevClientManager.swift',
        'QRScannerViewController.swift',
        'LynxInitProcessor.swift',
    ];
    for (const f of templateFiles) {
        const src = templateDir ? path.join(templateDir, f) : null;
        if (src && fs.existsSync(src)) {
            writeFile(path.join(projectDir, f), readAndSubstituteTemplate(src, templateVars));
        } else {
            const fallback = (() => {
                switch (f) {
                    case 'DevLauncherViewController.swift': return getDevLauncherViewControllerSwift();
                    case 'ProjectViewController.swift': return getProjectViewControllerSwift();
                    case 'LynxPushViewController.swift': return getLynxPushViewControllerSwift();
                    case 'DevTemplateProvider.swift': return getDevTemplateProviderSwift();
                    case 'DevClientManager.swift': return getDevClientManagerSwift();
                    case 'QRScannerViewController.swift': return getQRScannerViewControllerSwift();
                    case 'LynxInitProcessor.swift': return getLynxInitProcessorSwift();
                    default: return '';
                }
            })();
            if (fallback) writeFile(path.join(projectDir, f), fallback);
        }
    }
    writeFile(path.join(projectDir, BRIDGING_HEADER), getBridgingHeader());
    writeFile(path.join(projectDir, 'Info.plist'), getInfoPlist());
    writeFile(path.join(projectDir, 'Base.lproj', 'Main.storyboard'), getMainStoryboard());
    writeFile(path.join(projectDir, 'Base.lproj', 'LaunchScreen.storyboard'), getLaunchScreenStoryboard());
    const appIconDir = path.join(projectDir, 'Assets.xcassets', 'AppIcon.appiconset');
    fs.mkdirSync(appIconDir, { recursive: true });
    let iconApplied = false;
    try {
        const resolved = resolveDevAppPaths(process.cwd());
        const iconPaths = resolveIconPaths(resolved.projectRoot, resolved.config);
        if (iconPaths && applyIosAppIconAssets(appIconDir, iconPaths)) {
            iconApplied = true;
        }
    } catch {
        // fall through to placeholder
    }
    if (!iconApplied) {
        writeFile(
            path.join(appIconDir, 'Contents.json'),
            JSON.stringify({ images: [{ idiom: 'universal', platform: 'ios', size: '1024x1024' }], info: { author: 'xcode', version: 1 } }, null, 2)
        );
    }
    writeFile(
        path.join(projectDir, 'Assets.xcassets', 'Contents.json'),
        JSON.stringify({ info: { author: 'xcode', version: 1 } }, null, 2)
    );

    // Placeholder bundle file — replaced when building
    writeFile(path.join(projectDir, 'dev-client.lynx.bundle'), '');

    try {
        fs.mkdirSync(xcodeprojDir, { recursive: true });
        writeFile(path.join(xcodeprojDir, 'project.pbxproj'), generatePbxproj(ids));
    } catch (error: any) {
        console.error(`❌ Failed to write TamerDevApp Xcode project: ${error?.message ?? error}`);
        throw error;
    }

    console.log(`✅ TamerDevApp iOS project created at ${iosDir}`);
    await setupCocoaPods(iosDir);
}

function syncDevAppSourceFiles(iosDir: string, repoRoot: string): void {
    const projectDir = path.join(iosDir, APP_NAME);
    const devClientPkg = findDevClientPackage(repoRoot);
    const templateDir = devClientPkg ? path.join(devClientPkg, 'ios', 'templates') : null;
    const templateVars = { PROJECT_BUNDLE_SEGMENT: 'tamer-dev-app' };
    const templateFiles = [
        'DevLauncherViewController.swift',
        'ProjectViewController.swift',
        'LynxPushViewController.swift',
        'DevTemplateProvider.swift',
        'DevClientManager.swift',
        'QRScannerViewController.swift',
        'LynxInitProcessor.swift',
    ];

    writeFile(path.join(iosDir, 'Podfile'), getPodfile());
    writeFile(path.join(projectDir, 'AppDelegate.swift'), getAppDelegateSwift());
    for (const f of templateFiles) {
        const src = templateDir ? path.join(templateDir, f) : null;
        if (src && fs.existsSync(src)) {
            writeFile(path.join(projectDir, f), readAndSubstituteTemplate(src, templateVars));
            continue;
        }
        const fallback = (() => {
            switch (f) {
                case 'DevLauncherViewController.swift': return getDevLauncherViewControllerSwift();
                case 'ProjectViewController.swift': return getProjectViewControllerSwift();
                case 'LynxPushViewController.swift': return '';
                case 'DevTemplateProvider.swift': return getDevTemplateProviderSwift();
                case 'DevClientManager.swift': return getDevClientManagerSwift();
                case 'QRScannerViewController.swift': return getQRScannerViewControllerSwift();
                case 'LynxInitProcessor.swift': return getLynxInitProcessorSwift();
                default: return '';
            }
        })();
        if (fallback) writeFile(path.join(projectDir, f), fallback);
    }
    writeFile(path.join(projectDir, BRIDGING_HEADER), getBridgingHeader());
    writeFile(path.join(projectDir, 'Info.plist'), getInfoPlist());
    writeFile(path.join(projectDir, 'Base.lproj', 'Main.storyboard'), getMainStoryboard());
    writeFile(path.join(projectDir, 'Base.lproj', 'LaunchScreen.storyboard'), getLaunchScreenStoryboard());
}

async function syncDevClientIos(): Promise<void> {
    let resolved: ReturnType<typeof resolveDevAppPaths>;
    let repoRoot: string;
    try {
        resolved = resolveDevAppPaths(process.cwd());
        repoRoot = resolved.projectRoot;
    } catch (e: any) {
        console.error(`❌ ${e.message}`);
        process.exit(1);
    }

    const iosDir = resolved.iosDir;
    const workspacePath = path.join(iosDir, `${APP_NAME}.xcworkspace`);
    const projectDir = path.join(iosDir, APP_NAME);
    const pbxprojPath = path.join(iosDir, `${APP_NAME}.xcodeproj`, 'project.pbxproj');
    const hasGeneratedProject =
        fs.existsSync(path.join(projectDir, 'AppDelegate.swift')) &&
        fs.existsSync(pbxprojPath);

    if (!hasGeneratedProject) {
        await createDevAppProject(iosDir, repoRoot);
    } else if (!fs.existsSync(workspacePath)) {
        await setupCocoaPods(iosDir);
        console.log(`ℹ️  iOS dev-app project exists; ran pod install`);
    } else {
        console.log(`ℹ️  iOS dev-app project already exists at ${iosDir}`);
    }

    syncDevAppSourceFiles(iosDir, repoRoot);

    // Run autolink from dev-app directory (changes CWD temporarily)
    const prev = process.cwd();
    process.chdir(resolved.projectRoot);
    try {
        ios_autolink();
    } finally {
        process.chdir(prev);
    }

    // Build dev-client bundle
    const devClientDir = resolved.lynxProjectDir;
    console.log('📦 Building dev-client Lynx bundle...');
    execSync('npm run build', { stdio: 'inherit', cwd: devClientDir });

    const distDir = path.join(devClientDir, resolved.lynxBundleRootRel);
    copyDistAssets(distDir, projectDir, resolved.lynxBundleFile);
    console.log('✨ Copied dev-client bundle and assets to iOS project');

    if (fs.existsSync(pbxprojPath)) {
        const skip = new Set(['.rspeedy', 'stats.json']);
        for (const entry of fs.readdirSync(distDir)) {
            if (skip.has(entry)) continue;
            const entryPath = path.join(distDir, entry);
            if (fs.statSync(entryPath).isDirectory()) {
                addResourceFolderToXcodeProject(pbxprojPath, APP_NAME, entry);
            } else {
                addResourceToXcodeProject(pbxprojPath, APP_NAME, entry);
            }
        }
    }
}

export default syncDevClientIos;
export { createDevAppProject };
