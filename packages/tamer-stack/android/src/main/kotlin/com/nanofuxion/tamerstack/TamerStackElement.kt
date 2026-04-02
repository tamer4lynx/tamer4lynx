package com.nanofuxion.tamerstack

import android.content.Context
import android.graphics.Rect
import android.view.View
import com.lynx.tasm.behavior.LynxContext
import com.lynx.tasm.behavior.StylesDiffMap
import com.lynx.tasm.behavior.TouchEventDispatcher
import com.lynx.tasm.behavior.ui.LynxBaseUI
import com.lynx.tasm.behavior.ui.LynxUI
import com.lynx.tasm.behavior.ui.UIGroup
import com.lynx.tasm.behavior.ui.UIParent
import com.lynx.tasm.behavior.ui.view.AndroidView
import com.lynx.tasm.event.EventsListener
import com.lynx.tasm.utils.DisplayMetricsHolder

/**
 * Proxy in the Lynx layout node for <stack-screen>.
 *
 * This element is zero-size in the layout tree. All child operations and rendering
 * are delegated to [TamerStackInnerView], which promotes the content into a separate
 * native container managed by [TamerStackManager].
 */
open class TamerStackElement(context: LynxContext) : UIGroup<AndroidView>(context) {

    private val mInnerView = TamerStackInnerView(context, this)

    init {
        super.insertChild(mInnerView, 0)
    }

    override fun createView(context: Context): AndroidView {
        return object : AndroidView(context) {
            override fun onVisibilityChanged(changedView: View, visibility: Int) {
                if (visibility == View.GONE || visibility == View.INVISIBLE) {
                    onDetach()
                } else if (visibility == View.VISIBLE) {
                    onAttach()
                }
            }
        }
    }

    override fun updateLayout(
        left: Int, top: Int, width: Int, height: Int,
        paddingLeft: Int, paddingTop: Int, paddingRight: Int, paddingBottom: Int,
        marginLeft: Int, marginTop: Int, marginRight: Int, marginBottom: Int,
        borderLeftWidth: Int, borderTopWidth: Int, borderRightWidth: Int, borderBottomWidth: Int,
        bound: Rect?
    ) {
        super.updateLayout(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, null)
        val metrics = DisplayMetricsHolder.getRealScreenDisplayMetrics(mContext)
        mInnerView.updateLayout(
            0, 0, metrics.widthPixels, metrics.heightPixels,
            0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, null
        )
    }

    override fun updateLayoutInfo(layout: LynxBaseUI?) {
        super.updateLayoutInfo(layout)
        mInnerView.updateLayoutInfo(layout)
    }

    override fun updateDrawingLayoutInfo(left: Int, top: Int, bounds: Rect?): Boolean {
        super.updateDrawingLayoutInfo(left, top, bounds)
        return mInnerView.updateDrawingLayoutInfo(left, top, bounds)
    }

    override fun insertChild(child: LynxBaseUI?, index: Int) = mInnerView.insertChild(child, index)
    override fun insertView(child: LynxUI<*>?) = mInnerView.insertView(child)
    override fun insertDrawList(mark: LynxBaseUI?, child: LynxBaseUI?) = mInnerView.insertDrawList(mark, child)
    override fun removeChild(child: LynxBaseUI?) = mInnerView.removeChild(child)
    override fun removeView(child: LynxBaseUI?) = mInnerView.removeView(child)
    override fun updateExtraData(extraData: Any?) = mInnerView.updateExtraData(extraData)
    override fun isUserInteractionEnabled() = false

    override fun setParent(parent: UIParent?) {
        super.setParent(parent)
        mInnerView.parent = parent
    }

    override fun onDetach() = mInnerView.onDetach()

    override fun setEvents(events: MutableMap<String, EventsListener>?) {
        mInnerView.events = events
    }

    override fun getTouchEventDispatcher(): TouchEventDispatcher? = mInnerView.touchEventDispatcher

    override fun updatePropertiesInterval(props: StylesDiffMap?) = mInnerView.updatePropertiesInterval(props)
    override fun afterPropsUpdated(props: StylesDiffMap?) = mInnerView.afterPropsUpdated(props)
    override fun setBackgroundColor(backgroundColor: Int) { mInnerView.backgroundColor = backgroundColor }
    override fun getTransitionUI(): LynxUI<*> = mInnerView
    @Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")
    @Deprecated("Deprecated in Lynx SDK", replaceWith = ReplaceWith(""))
    override fun onAnimationUpdated() = mInnerView.onAnimationUpdated()
    override fun getChildCount() = mInnerView.childCount
    override fun getChildAt(index: Int): LynxBaseUI = mInnerView.getChildAt(index)
    override fun getChildren(): MutableList<LynxBaseUI> = mInnerView.getChildren()

    override fun setSign(sign: Int, tagName: String?) {
        super.setSign(sign, tagName)
        mInnerView.setSign(sign, tagName)
    }

    override fun isOverlay() = true
}
