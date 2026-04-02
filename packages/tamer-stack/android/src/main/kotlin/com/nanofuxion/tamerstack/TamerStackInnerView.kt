package com.nanofuxion.tamerstack

import android.content.Context
import android.view.ViewGroup
import android.widget.FrameLayout
import com.lynx.react.bridge.ReadableType
import com.lynx.react.bridge.Dynamic
import com.lynx.tasm.behavior.LynxContext
import com.lynx.tasm.behavior.LynxProp
import com.lynx.tasm.behavior.TouchEventDispatcher
import com.lynx.tasm.behavior.ui.LynxBaseUI
import com.lynx.tasm.behavior.ui.UIGroup
import com.lynx.tasm.behavior.ui.UIParent
import com.lynx.tasm.behavior.ui.view.AndroidView

/**
 * The real rendering host for <stack-screen>.
 *
 * This UIGroup holds the Lynx-rendered children and places them into a FrameLayout
 * container registered with [TamerStackManager]. The container is a sibling of the
 * LynxView in the Activity hierarchy, so it can be animated independently during
 * push/pop transitions without capturing any bitmaps.
 */
class TamerStackInnerView(
    context: LynxContext,
    val proxy: TamerStackElement,
) : UIGroup<AndroidView>(context) {

    private var mScreenId: String? = null
    private var mVisible = false

    private val mContainer: FrameLayout = FrameLayout(context).also { fl ->
        fl.layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT,
        )
        fl.addView(mView, ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT)
    }

    private var mEventDispatcher: TouchEventDispatcher? = TouchEventDispatcher(context.lynxUIOwner)

    override fun createView(context: Context?): AndroidView = AndroidView(context)

    override fun getTouchEventDispatcher(): TouchEventDispatcher? = mEventDispatcher

    @LynxProp(name = "screen-id")
    fun setScreenId(id: Dynamic?) {
        mScreenId = when (id?.type) {
            ReadableType.String -> id.asString()
            else -> null
        }
    }

    @LynxProp(name = "visible")
    fun setVisible(visible: Dynamic?) {
        val v = when (visible?.type) {
            ReadableType.Boolean -> visible.asBoolean()
            ReadableType.String -> visible.asString()?.toBoolean() ?: false
            else -> false
        }
        if (v == mVisible) return
        mVisible = v
        if (v) showScreen() else hideScreen()
    }

    private fun showScreen() {
        TamerStackManager.pushScreen(resolvedId(), mContainer, mContext)
    }

    private fun hideScreen() {
        TamerStackManager.popScreen(resolvedId())
    }

    private fun resolvedId(): String = mScreenId ?: proxy.sign.toString()

    override fun setParent(parent: UIParent?) {
        super.setParent(parent)
        if (parent == null) {
            TamerStackManager.removeScreen(resolvedId())
        } else if (mVisible) {
            showScreen()
        }
    }

    override fun onDetach() {
        super.onDetach()
    }

    override fun destroy() {
        TamerStackManager.removeScreen(resolvedId())
        super.destroy()
    }

    override fun isUserInteractionEnabled() = false
    override fun isOverlay() = true
}
