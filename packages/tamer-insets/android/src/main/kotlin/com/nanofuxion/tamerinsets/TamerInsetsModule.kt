package com.nanofuxion.tamerinsets

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.view.View
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsAnimationCompat
import androidx.core.view.WindowInsetsCompat
import android.util.Log
import com.lynx.jsbridge.LynxMethod
import com.lynx.jsbridge.LynxModule
import com.lynx.react.bridge.Callback
import com.lynx.react.bridge.JavaOnlyArray
import com.lynx.react.bridge.JavaOnlyMap
import com.lynx.tasm.behavior.LynxContext
import org.json.JSONObject

class TamerInsetsModule(context: Context) : LynxModule(context) {
    data class InsetsState(
        val top: Int,
        val left: Int,
        val right: Int,
        val bottom: Int,
    )

    companion object {
        @Volatile
        var instance: TamerInsetsModule? = null
            private set

        @Volatile
        private var hostView: View? = null

        fun attachHostView(view: View?) {
            if (hostView !== view) {
                hostView?.let { current ->
                    ViewCompat.setOnApplyWindowInsetsListener(current, null)
                    ViewCompat.setWindowInsetsAnimationCallback(current, null)
                }
            }
            Log.i("TamerInsets", "attachHostView: $view (instance is ${if (instance != null) "SET" else "NULL"})")
            hostView = view
            view?.let {
                instance?.setupInsetsListener(it)
            }
        }
    }

    private val mainHandler = Handler(Looper.getMainLooper())
    private var lastTop: Int = -1
    private var lastLeft: Int = -1
    private var lastRight: Int = -1
    private var lastBottom: Int = -1
    private var lastImeVisible: Boolean? = null
    private var lastImeHeight: Int = -1

    init {
        Log.i("TamerInsets", "TamerInsetsModule init")
        instance = this
        mainHandler.post {
            Log.i("TamerInsets", "TamerInsetsModule mainHandler init, hostView is ${if (hostView != null) "SET" else "NULL"}")
            hostView?.let { setupInsetsListener(it) }
        }
    }

    fun setupInsetsListener(view: View) {
        ViewCompat.setOnApplyWindowInsetsListener(view) { _, insets ->
            updateInsets(insets)
            updateKeyboard(insets)
            insets
        }
        ViewCompat.setWindowInsetsAnimationCallback(
            view,
            object : WindowInsetsAnimationCompat.Callback(DISPATCH_MODE_CONTINUE_ON_SUBTREE) {
                override fun onProgress(
                    insets: WindowInsetsCompat,
                    runningAnimations: MutableList<WindowInsetsAnimationCompat>
                ): WindowInsetsCompat {
                    updateKeyboard(insets)
                    return insets
                }

                override fun onEnd(animation: WindowInsetsAnimationCompat) {
                    ViewCompat.getRootWindowInsets(view)?.let { latest ->
                        updateInsets(latest)
                        updateKeyboard(latest)
                    }
                }
            }
        )
        view.post {
            ViewCompat.requestApplyInsets(view)
            ViewCompat.getRootWindowInsets(view)?.let {
                updateInsets(it)
                updateKeyboard(it)
            }
        }
    }

    private fun updateInsets(insets: WindowInsetsCompat) {
        val systemBars = insets.getInsetsIgnoringVisibility(WindowInsetsCompat.Type.systemBars())
        val displayCutout = insets.getInsets(WindowInsetsCompat.Type.displayCutout())
        val top = maxOf(systemBars.top, displayCutout.top)
        val left = maxOf(systemBars.left, displayCutout.left)
        val right = maxOf(systemBars.right, displayCutout.right)
        val bottom = maxOf(systemBars.bottom, displayCutout.bottom)
        if (top == lastTop && left == lastLeft && right == lastRight && bottom == lastBottom) return
        lastTop = top
        lastLeft = left
        lastRight = right
        lastBottom = bottom
        Log.d("TamerInsets", "updateInsets: top=$top, bottom=$bottom, left=$left, right=$right")
        val map = JavaOnlyMap().apply {
            putDouble("top", top.toDouble())
            putDouble("left", left.toDouble())
            putDouble("right", right.toDouble())
            putDouble("bottom", bottom.toDouble())
        }
        emitGlobalEvent("tamer-insets:change", map)
    }

    private fun updateKeyboard(insets: WindowInsetsCompat) {
        val imeVisible = insets.isVisible(WindowInsetsCompat.Type.ime())
        val imeHeight = insets.getInsets(WindowInsetsCompat.Type.ime()).bottom
        if (imeVisible == lastImeVisible && imeHeight == lastImeHeight) return
        lastImeVisible = imeVisible
        lastImeHeight = imeHeight
        Log.d("TamerInsets", "updateKeyboard: visible=$imeVisible, height=$imeHeight")
        val map = JavaOnlyMap().apply {
            putBoolean("visible", imeVisible)
            putDouble("height", imeHeight.toDouble())
        }
        emitGlobalEvent("tamer-insets:keyboard", map)
    }

    private fun emitGlobalEvent(name: String, map: JavaOnlyMap) {
        mainHandler.post {
            val view = hostView ?: return@post
            val lynxView = view as? com.lynx.tasm.LynxView ?: return@post
            val lynxContext = lynxView.lynxContext ?: return@post
            try {
                val payload = JSONObject().apply {
                    if (map.hasKey("top")) put("top", map.getDouble("top"))
                    if (map.hasKey("left")) put("left", map.getDouble("left"))
                    if (map.hasKey("right")) put("right", map.getDouble("right"))
                    if (map.hasKey("bottom")) put("bottom", map.getDouble("bottom"))
                    if (map.hasKey("visible")) put("visible", map.getBoolean("visible"))
                    if (map.hasKey("height")) put("height", map.getDouble("height"))
                }.toString()
                val params = JavaOnlyArray().apply {
                    pushMap(JavaOnlyMap().apply { putString("payload", payload) })
                }
                lynxContext.sendGlobalEvent(name, params)
            } catch (e: Exception) {
                Log.w("TamerInsets", "emitGlobalEvent failed: $name", e)
            }
        }
    }

    private fun currentInsetsMap(): JavaOnlyMap {
        return JavaOnlyMap().apply {
            putDouble("top", lastTop.coerceAtLeast(0).toDouble())
            putDouble("left", lastLeft.coerceAtLeast(0).toDouble())
            putDouble("right", lastRight.coerceAtLeast(0).toDouble())
            putDouble("bottom", lastBottom.coerceAtLeast(0).toDouble())
        }
    }

    private fun currentKeyboardMap(): JavaOnlyMap {
        return JavaOnlyMap().apply {
            putBoolean("visible", lastImeVisible == true)
            putDouble("height", lastImeHeight.coerceAtLeast(0).toDouble())
        }
    }

    @LynxMethod
    fun getInsets(callback: Callback) {
        mainHandler.post {
            hostView?.let { view ->
                ViewCompat.getRootWindowInsets(view)?.let { updateInsets(it) }
            }
            val map = currentInsetsMap()
            try {
                callback.invoke(map)
            } catch (e: Exception) {
                Log.w("TamerInsets", "getInsets callback.invoke failed", e)
            }
        }
    }

    @LynxMethod
    fun getKeyboard(callback: Callback) {
        mainHandler.post {
            hostView?.let { view ->
                ViewCompat.getRootWindowInsets(view)?.let { updateKeyboard(it) }
            }
            val map = currentKeyboardMap()
            try {
                callback.invoke(map)
            } catch (e: Exception) {
                Log.w("TamerInsets", "getKeyboard callback.invoke failed", e)
            }
        }
    }
}
