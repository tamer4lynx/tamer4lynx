import Foundation
import Lynx

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

public enum LynxEmbeddable {
    public static func initEnvironment() {
        let env = LynxEnv.sharedInstance()
        let globalConfig = LynxConfig(provider: env.config.templateProvider)
                globalConfig.register(JiggleModule.self)
                globalConfig.register(BiometricModule.self)
                globalConfig.register(DevClientModule.self)
                globalConfig.register(DisplayBrowserModule.self)
                globalConfig.registerUI(TamerIconElement.self, withName: "icon")
                globalConfig.register(TamerInsetsModule.self)
                globalConfig.register(LinkingModule.self)
                globalConfig.register(TamerRouterNativeModule.self)
                globalConfig.register(SecureStoreModule.self)
                globalConfig.register(SystemUIModule.self)
                globalConfig.register(LynxFetchModule.self)
                globalConfig.register(LynxWebSocketModule.self)

        env.prepareConfig(globalConfig)
    }
}
