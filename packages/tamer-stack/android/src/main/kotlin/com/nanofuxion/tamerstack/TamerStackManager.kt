package com.nanofuxion.tamerstack

import android.app.Activity
import android.os.Handler
import android.os.Looper
import android.view.View
import android.view.ViewGroup
import android.view.animation.AccelerateDecelerateInterpolator
import android.widget.FrameLayout
import com.lynx.tasm.behavior.LynxContext
import com.lynx.tasm.utils.ContextUtils

/**
 * Singleton that manages the native stack of <stack-screen> containers.
 *
 * A single [FrameLayout] host is inserted as a sibling of the LynxView in the
 * Activity layout. Each <stack-screen> that becomes visible pushes a container
 * onto this host; hiding removes and animates it out. No bitmaps are ever captured.
 */
object TamerStackManager {

    private const val ANIM_DURATION_MS = 220L

    private val mainHandler = Handler(Looper.getMainLooper())

    private data class ScreenEntry(val id: String, val container: FrameLayout)

    private val stack = mutableListOf<ScreenEntry>()

    private var stackHost: FrameLayout? = null

    /** Called by the Activity after it attaches its LynxView. */
    fun attachHost(activity: Activity, lynxView: View) {
        if (stackHost != null) return
        val parent = lynxView.parent as? ViewGroup ?: return
        val host = FrameLayout(activity).apply {
            layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            )
        }
        parent.addView(host)
        stackHost = host
    }

    /** Called by the Activity when its LynxView is detached / destroyed. */
    fun detachHost() {
        stackHost?.let { host ->
            (host.parent as? ViewGroup)?.removeView(host)
        }
        stackHost = null
        stack.clear()
    }

    fun pushScreen(id: String, container: FrameLayout, lynxContext: LynxContext) {
        mainHandler.post {
            val host = ensureHost(lynxContext) ?: return@post
            if (stack.any { it.id == id }) return@post
            stack.add(ScreenEntry(id, container))
            if (container.parent != host) {
                (container.parent as? ViewGroup)?.removeView(container)
                host.addView(container)
            }
            animatePush(container, host)
        }
    }

    fun popScreen(id: String) {
        mainHandler.post {
            val entry = stack.lastOrNull { it.id == id } ?: return@post
            animatePop(entry.container) {
                (entry.container.parent as? ViewGroup)?.removeView(entry.container)
                stack.remove(entry)
            }
        }
    }

    fun removeScreen(id: String) {
        mainHandler.post {
            val entry = stack.firstOrNull { it.id == id } ?: return@post
            (entry.container.parent as? ViewGroup)?.removeView(entry.container)
            stack.remove(entry)
        }
    }

    private fun ensureHost(lynxContext: LynxContext): FrameLayout? {
        stackHost?.let { return it }
        val activity = ContextUtils.getActivity(lynxContext) as? Activity ?: return null
        val rootView = activity.window.decorView.rootView as? ViewGroup ?: return null
        val host = FrameLayout(activity).apply {
            layoutParams = FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT,
            )
        }
        rootView.addView(host)
        stackHost = host
        return host
    }

    private fun animatePush(container: FrameLayout, host: FrameLayout) {
        val width = host.width.takeIf { it > 0 } ?: container.width.takeIf { it > 0 } ?: 1080
        container.translationX = width.toFloat()
        container.animate()
            .translationX(0f)
            .setDuration(ANIM_DURATION_MS)
            .setInterpolator(AccelerateDecelerateInterpolator())
            .start()
    }

    private fun animatePop(container: FrameLayout, onEnd: () -> Unit) {
        val width = (container.parent as? ViewGroup)?.width?.takeIf { it > 0 }
            ?: container.width.takeIf { it > 0 } ?: 1080
        container.animate()
            .translationX(width.toFloat())
            .setDuration(ANIM_DURATION_MS)
            .setInterpolator(AccelerateDecelerateInterpolator())
            .withEndAction { onEnd() }
            .start()
    }
}
