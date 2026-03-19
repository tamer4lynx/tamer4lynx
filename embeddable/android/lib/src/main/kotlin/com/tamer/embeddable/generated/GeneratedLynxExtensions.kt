package com.tamer.embeddable.generated

import android.content.Context
import com.lynx.tasm.LynxEnv
import com.nanofuxion.vibration.JiggleModule
import com.nanofuxion.tamerbiometric.BiometricModule
import com.nanofuxion.tamerdevclient.DevClientModule
import com.nanofuxion.tamerdisplaybrowser.DisplayBrowserModule
import com.nanofuxion.tamerinsets.TamerInsetsModule
import com.nanofuxion.tamerlinking.LinkingModule
import com.nanofuxion.tamerrouter.TamerRouterNativeModule
import com.nanofuxion.tamersecurestore.SecureStoreModule
import com.nanofuxion.tamersystemui.SystemUIModule
import com.nanofuxion.tamertransports.LynxFetchModule
import com.nanofuxion.tamertransports.LynxWebSocketModule
import com.nanofuxion.tamericons.IconElement

object GeneratedLynxExtensions {
    fun register(context: Context) {
        LynxEnv.inst().registerModule("JiggleModule", JiggleModule::class.java)
        LynxEnv.inst().registerModule("BiometricModule", BiometricModule::class.java)
        LynxEnv.inst().registerModule("DevClientModule", DevClientModule::class.java)
        LynxEnv.inst().registerModule("DisplayBrowserModule", DisplayBrowserModule::class.java)
        LynxEnv.inst().registerModule("TamerInsetsModule", TamerInsetsModule::class.java)
        LynxEnv.inst().registerModule("LinkingModule", LinkingModule::class.java)
        LynxEnv.inst().registerModule("TamerRouterNativeModule", TamerRouterNativeModule::class.java)
        LynxEnv.inst().registerModule("SecureStoreModule", SecureStoreModule::class.java)
        LynxEnv.inst().registerModule("SystemUIModule", SystemUIModule::class.java)
        LynxEnv.inst().registerModule("LynxFetchModule", LynxFetchModule::class.java)
        LynxEnv.inst().registerModule("LynxWebSocketModule", LynxWebSocketModule::class.java)
        LynxEnv.inst().addBehavior(object : com.lynx.tasm.behavior.Behavior("icon") {
            override fun createUI(context: com.lynx.tasm.behavior.LynxContext): com.lynx.tasm.behavior.ui.LynxUI<*> {
                return IconElement(context)
            }
        })
    }
    fun onHostViewChanged(view: android.view.View?) {
        BiometricModule.attachHostView(view)
        SecureStoreModule.attachHostView(view)
        SystemUIModule.attachHostView(view)
    }
}
