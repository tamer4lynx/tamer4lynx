import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { randomBytes } from 'crypto';
import { resolveDevAppPaths, findDevClientPackage } from '../common/hostConfig';
import { setupCocoaPods } from './getPod';
import ios_autolink from './autolink';

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

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        LynxInitProcessor.shared.setupEnvironment()

        window = UIWindow(frame: UIScreen.main.bounds)
        window?.rootViewController = DevLauncherViewController()
        window?.makeKeyAndVisible()
        return true
    }

    func application(_ app: UIApplication, open url: URL,
                     options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        if url.scheme == "tamerdevapp", let host = url.host, host == "project" {
            presentProjectViewController()
        }
        return true
    }

    @objc func presentProjectViewController() {
        guard let root = window?.rootViewController else { return }
        let projectVC = ProjectViewController()
        projectVC.modalPresentationStyle = .fullScreen
        root.present(projectVC, animated: true)
    }
}
`;
}

function getDevLauncherViewControllerSwift(): string {
    return `import UIKit
import Lynx
import tamerdevclient
import tamerinsets
import tamersystemui

class DevLauncherViewController: UIViewController {
    private var lynxView: LynxView?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        edgesForExtendedLayout = .all
        extendedLayoutIncludesOpaqueBars = true
        additionalSafeAreaInsets = .zero
        view.insetsLayoutMarginsFromSafeArea = false
        view.preservesSuperviewLayoutMargins = false
        viewRespectsSystemMinimumLayoutMargins = false
        setupLynxView()
        setupDevClientModule()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        if let lynxView = lynxView {
            applyFullscreenLayout(to: lynxView)
        }
    }

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        TamerInsetsModule.reRequestInsets()
    }

    override var preferredStatusBarStyle: UIStatusBarStyle { SystemUIModule.statusBarStyleForHost }

    private func setupLynxView() {
        let size = fullscreenBounds().size
        let lv = LynxView { builder in
            builder.config = LynxConfig(provider: DevTemplateProvider())
            builder.screenSize = size
            builder.fontScale = 1.0
        }
        lv.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        lv.insetsLayoutMarginsFromSafeArea = false
        lv.preservesSuperviewLayoutMargins = false
        view.addSubview(lv)
        applyFullscreenLayout(to: lv)
        TamerInsetsModule.attachHostView(lv)
        lv.loadTemplate(fromURL: "dev-client.lynx.bundle", initData: nil)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self, weak lv] in
            guard let self, let lv else { return }
            self.logViewport("devclient post-load", lynxView: lv)
            self.applyFullscreenLayout(to: lv)
        }
        self.lynxView = lv
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
        logViewport("devclient apply", lynxView: lynxView)
    }

    private func fullscreenBounds() -> CGRect {
        let bounds = view.bounds
        if bounds.width > 0, bounds.height > 0 {
            return bounds
        }
        return UIScreen.main.bounds
    }

    private func logViewport(_ label: String, lynxView: LynxView) {
        let rootWidth = lynxView.rootWidth()
        let rootHeight = lynxView.rootHeight()
        let intrinsic = lynxView.intrinsicContentSize
        NSLog("[DevLauncher] %@ view=%@ safe=%@ lynxFrame=%@ lynxBounds=%@ root=%0.2fx%0.2f intrinsic=%@", label, NSCoder.string(for: view.bounds), NSCoder.string(for: view.safeAreaInsets), NSCoder.string(for: lynxView.frame), NSCoder.string(for: lynxView.bounds), rootWidth, rootHeight, NSCoder.string(for: intrinsic))
    }

    private func setupDevClientModule() {
        DevClientModule.presentQRScanner = { [weak self] completion in
            let scanner = QRScannerViewController()
            scanner.onResult = { url in
                scanner.dismiss(animated: true) { completion(url) }
            }
            scanner.modalPresentationStyle = .fullScreen
            self?.present(scanner, animated: true)
        }

        DevClientModule.reloadProjectHandler = { [weak self] in
            guard let self = self else { return }
            let projectVC = ProjectViewController()
            projectVC.modalPresentationStyle = .fullScreen
            self.present(projectVC, animated: true)
        }
    }
}
`;
}

function getProjectViewControllerSwift(): string {
    return `import UIKit
import Lynx
import tamerdevclient
import tamerinsets
import tamersystemui

class ProjectViewController: UIViewController {
    private var lynxView: LynxView?
    private var devClientManager: DevClientManager?

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        edgesForExtendedLayout = .all
        extendedLayoutIncludesOpaqueBars = true
        additionalSafeAreaInsets = .zero
        view.insetsLayoutMarginsFromSafeArea = false
        view.preservesSuperviewLayoutMargins = false
        viewRespectsSystemMinimumLayoutMargins = false
        setupLynxView()
        TamerRelogLogService.connect()
        devClientManager = DevClientManager(onReload: { [weak self] in
            self?.reloadLynxView()
        })
        devClientManager?.connect()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        if let lynxView = lynxView {
            applyFullscreenLayout(to: lynxView)
        }
    }

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        TamerInsetsModule.reRequestInsets()
    }

    override var preferredStatusBarStyle: UIStatusBarStyle { SystemUIModule.statusBarStyleForHost }

    private func buildLynxView() -> LynxView {
        let size = fullscreenBounds().size
        let lv = LynxView { builder in
            builder.config = LynxConfig(provider: DevTemplateProvider())
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
        let lv = buildLynxView()
        view.addSubview(lv)
        TamerInsetsModule.attachHostView(lv)
        lv.loadTemplate(fromURL: "main.lynx.bundle", initData: nil)
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { [weak self, weak lv] in
            guard let self, let lv else { return }
            self.logViewport("project post-load", lynxView: lv)
            self.applyFullscreenLayout(to: lv)
        }
        self.lynxView = lv
    }

    private func reloadLynxView() {
        TamerInsetsModule.attachHostView(nil)
        lynxView?.removeFromSuperview()
        lynxView = nil
        setupLynxView()
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

    private func logViewport(_ label: String, lynxView: LynxView) {
        let rootWidth = lynxView.rootWidth()
        let rootHeight = lynxView.rootHeight()
        let intrinsic = lynxView.intrinsicContentSize
        NSLog("[ProjectVC] %@ view=%@ safe=%@ lynxFrame=%@ lynxBounds=%@ root=%0.2fx%0.2f intrinsic=%@", label, NSCoder.string(for: view.bounds), NSCoder.string(for: view.safeAreaInsets), NSCoder.string(for: lynxView.frame), NSCoder.string(for: lynxView.bounds), rootWidth, rootHeight, NSCoder.string(for: intrinsic))
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        if isBeingDismissed || isMovingFromParent {
            devClientManager?.disconnect()
            TamerRelogLogService.disconnect()
        }
    }
}
`;
}

function getDevTemplateProviderSwift(): string {
    return `import Foundation
import Lynx
import tamerdevclient

class DevTemplateProvider: NSObject, LynxTemplateProvider {
    private static let devClientBundle = "dev-client.lynx.bundle"

    func loadTemplate(withUrl url: String!, onComplete callback: LynxTemplateLoadBlock!) {
        DispatchQueue.global(qos: .background).async {
            // dev-client.lynx.bundle always loads from the embedded asset
            if url == Self.devClientBundle || url?.hasSuffix("/" + Self.devClientBundle) == true {
                self.loadFromBundle(url: Self.devClientBundle, callback: callback)
                return
            }

            // Try the dev server first
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

                let candidates = ["/\\(url!)", "/tamer-dev-app/\\(url!)"]
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

    private func loadFromBundle(url: String?, callback: LynxTemplateLoadBlock!) {
        guard let url = url,
              let bundleUrl = Bundle.main.url(forResource: url, withExtension: nil),
              let data = try? Data(contentsOf: bundleUrl) else {
            let err = NSError(domain: "DevTemplateProvider", code: 404,
                              userInfo: [NSLocalizedDescriptionKey: "Bundle not found: \\(url ?? "nil")"])
            callback?(nil, err)
            return
        }
        callback?(data, nil)
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

    init(onReload: @escaping () -> Void) {
        self.onReload = onReload
    }

    func connect() {
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
                break
            }
        }
    }

    func disconnect() {
        webSocketTask?.cancel(with: .normalClosure, reason: nil)
        webSocketTask = nil
        session = nil
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

platform :ios, '13.0'

target '${APP_NAME}' do
  pod 'Lynx', '3.6.0', :subspecs => [
    'Framework',
  ], :modular_headers => true

  pod 'PrimJS', '3.6.1', :subspecs => ['quickjs', 'napi']

  pod 'LynxService', '3.6.0', :subspecs => [
    'Image',
    'Log',
    'Http',
  ]
  pod 'SDWebImage','5.15.5'
  pod 'SDWebImageWebPCoder', '0.11.0'

  # GENERATED AUTOLINK DEPENDENCIES START
  # This section is automatically generated by Tamer4Lynx.
  # Manual edits will be overwritten.
  # GENERATED AUTOLINK DEPENDENCIES END
end

post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['CLANG_CXX_LANGUAGE_STANDARD'] = 'gnu++17'
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '13.0'
      config.build_settings['CLANG_ENABLE_EXPLICIT_MODULES'] = 'NO'
      config.build_settings['SWIFT_ENABLE_EXPLICIT_MODULES'] = 'NO'
      config.build_settings['ONLY_ACTIVE_ARCH'] = 'YES'
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
			shellScript = "FONTS_SRC=\\"${SRCROOT}/../../tamer-icons/fonts\\"\\nif [ -d \\"$FONTS_SRC\\" ]; then\\n  cp -f \\"$FONTS_SRC/MaterialSymbolsOutlined.ttf\\" \\"${BUILT_PRODUCTS_DIR}/${PRODUCT_NAME}.app/\\" 2>/dev/null || true\\n  cp -f \\"$FONTS_SRC/fa-solid-900.ttf\\" \\"${BUILT_PRODUCTS_DIR}/${PRODUCT_NAME}.app/\\" 2>/dev/null || true\\nfi\\nCP_SRC=\\"${SRCROOT}/../../tamer-icons/android/src/main/assets/fonts/material-codepoints.txt\\"\\n[ -f \\"$CP_SRC\\" ] && cp -f \\"$CP_SRC\\" \\"${BUILT_PRODUCTS_DIR}/${PRODUCT_NAME}.app/\\" 2>/dev/null || true\\n";
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
				IPHONEOS_DEPLOYMENT_TARGET = 13.0;
				SDKROOT = iphoneos;
				SWIFT_ACTIVE_COMPILATION_CONDITIONS = DEBUG;
				SWIFT_OPTIMIZATION_LEVEL = "-Onone";
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
				IPHONEOS_DEPLOYMENT_TARGET = 13.0;
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
    writeFile(
        path.join(projectDir, 'Assets.xcassets', 'AppIcon.appiconset', 'Contents.json'),
        JSON.stringify({ images: [{ idiom: 'universal', platform: 'ios', size: '1024x1024' }], info: { author: 'xcode', version: 1 } }, null, 2)
    );
    writeFile(
        path.join(projectDir, 'Assets.xcassets', 'Contents.json'),
        JSON.stringify({ info: { author: 'xcode', version: 1 } }, null, 2)
    );

    // Placeholder bundle file — replaced when building
    writeFile(path.join(projectDir, 'dev-client.lynx.bundle'), '');

    fs.mkdirSync(xcodeprojDir, { recursive: true });
    writeFile(path.join(xcodeprojDir, 'project.pbxproj'), generatePbxproj(ids));

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
    const hasCommittedSource = fs.existsSync(path.join(projectDir, 'AppDelegate.swift'));

    if (!hasCommittedSource) {
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

    // Copy bundle into iOS project
    const bundleSrc = resolved.lynxBundlePath;
    const bundleDst = path.join(iosDir, APP_NAME, 'dev-client.lynx.bundle');
    if (fs.existsSync(bundleSrc)) {
        fs.copyFileSync(bundleSrc, bundleDst);
        console.log(`✨ Copied dev-client.lynx.bundle to iOS project`);
    } else {
        console.warn(`⚠️  Bundle not found at ${bundleSrc}`);
    }
}

export default syncDevClientIos;
export { createDevAppProject };
