// Copyright 2024 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.

import Foundation

// GENERATED IMPORTS START
import jiggle
import tamerbiometric
import tamerdevclient
import tamerdisplaybrowser
import tamericons
import tamerinsets
import tamerlinking
import tamerrouter
import tamersecurestore
import tamersystemui
import tamertransports
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
        // Register module from package: @tamer4lynx/jiggle
        globalConfig.register(JiggleModule.self)

        // Register module from package: @tamer4lynx/tamer-biometric
        globalConfig.register(BiometricModule.self)

        // Register module from package: @tamer4lynx/tamer-dev-client
        globalConfig.register(DevClientModule.self)

        // Register module from package: @tamer4lynx/tamer-display-browser
        globalConfig.register(DisplayBrowserModule.self)

        // Register element from package: @tamer4lynx/tamer-icons
        globalConfig.registerUI(TamerIconElement.self, withName: "icon")

        // Register module from package: @tamer4lynx/tamer-insets
        globalConfig.register(TamerInsetsModule.self)

        // Register module from package: @tamer4lynx/tamer-linking
        globalConfig.register(LinkingModule.self)

        // Register module from package: @tamer4lynx/tamer-router
        globalConfig.register(TamerRouterNativeModule.self)

        // Register module from package: @tamer4lynx/tamer-secure-store
        globalConfig.register(SecureStoreModule.self)

        // Register module from package: @tamer4lynx/tamer-system-ui
        globalConfig.register(SystemUIModule.self)

        // Register module from package: @tamer4lynx/tamer-transports
        globalConfig.register(LynxFetchModule.self)

        // Register module from package: @tamer4lynx/tamer-transports
        globalConfig.register(TamerTransportsWebSocketModule.self)
// GENERATED AUTOLINK END

		env.prepareConfig(globalConfig)
	}

	private func setupLynxService() {
		let webPCoder = SDImageWebPCoder.shared
		SDImageCodersManager.shared.addCoder(webPCoder)
	}
}
	