package com.tamer.embeddable

import android.content.Context
import android.view.ViewGroup
import com.lynx.tasm.LynxView
import com.lynx.tasm.LynxViewBuilder
import com.lynx.tasm.provider.AbsTemplateProvider

object LynxEmbeddable {
    fun init(context: Context) {
        com.tamer.embeddable.generated.GeneratedLynxExtensions.register(context)
    }

    fun buildLynxView(parent: ViewGroup, bundleUrl: String = "main.lynx.bundle"): LynxView {
        val ctx = parent.context
        val provider = object : AbsTemplateProvider() {
            override fun loadTemplate(url: String, callback: Callback) {
                Thread {
                    try {
                        ctx.assets.open(url).use { input ->
                            callback.onSuccess(input.readBytes())
                        }
                    } catch (e: Exception) {
                        callback.onFailed(e.message ?: "Load failed")
                    }
                }.start()
            }
        }
        val viewBuilder = LynxViewBuilder()
            .setTemplateProvider(provider)
        com.tamer.embeddable.generated.GeneratedLynxExtensions.configureViewBuilder(viewBuilder)
        val lv = viewBuilder.build(ctx)
        lv.layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        )
        parent.addView(lv)
        lv.renderTemplateUrl(bundleUrl, "")
        com.tamer.embeddable.generated.GeneratedLynxExtensions.onHostViewChanged(lv)
        return lv
    }
}
