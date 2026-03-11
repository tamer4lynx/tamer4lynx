export function getLynxExplorerInputSource(packageName: string): string {
  return `package ${packageName}.core

import android.content.Context
import android.graphics.Color
import android.text.Editable
import android.text.TextWatcher
import android.util.TypedValue
import android.view.Gravity
import android.view.View
import android.view.inputmethod.EditorInfo
import android.view.inputmethod.InputMethodManager
import androidx.appcompat.widget.AppCompatEditText
import com.lynx.react.bridge.Callback
import com.lynx.react.bridge.ReadableMap
import com.lynx.tasm.behavior.LynxContext
import com.lynx.tasm.behavior.LynxProp
import com.lynx.tasm.behavior.LynxUIMethod
import com.lynx.tasm.behavior.LynxUIMethodConstants
import com.lynx.tasm.behavior.ui.LynxUI
import com.lynx.tasm.event.LynxCustomEvent

class LynxExplorerInput(context: LynxContext) : LynxUI<AppCompatEditText>(context) {

    override fun createView(context: Context): AppCompatEditText {
        val view = AppCompatEditText(context)
        view.setLines(1)
        view.isSingleLine = true
        view.gravity = Gravity.CENTER_VERTICAL
        view.background = null
        view.imeOptions = EditorInfo.IME_ACTION_NONE
        view.setHorizontallyScrolling(true)
        view.setPadding(0, 0, 0, 0)
        view.setTextSize(TypedValue.COMPLEX_UNIT_SP, 16f)
        view.minHeight = TypedValue.applyDimension(
            TypedValue.COMPLEX_UNIT_DIP,
            52f,
            context.resources.displayMetrics
        ).toInt()
        view.setTextColor(Color.WHITE)
        view.setHintTextColor(Color.argb(160, 255, 255, 255))
        view.includeFontPadding = false
        view.isFocusableInTouchMode = true
        view.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) {}
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {}
            override fun afterTextChanged(s: Editable?) {
                emitEvent("input", mapOf("value" to (s?.toString() ?: "")))
            }
        })
        view.setOnFocusChangeListener { _: View?, hasFocus: Boolean ->
            if (!hasFocus) emitEvent("blur", null)
        }
        return view
    }

    override fun onLayoutUpdated() {
        super.onLayoutUpdated()
        val paddingTop = mPaddingTop + mBorderTopWidth
        val paddingBottom = mPaddingBottom + mBorderBottomWidth
        val paddingLeft = mPaddingLeft + mBorderLeftWidth
        val paddingRight = mPaddingRight + mBorderRightWidth
        mView.setPadding(paddingLeft, paddingTop, paddingRight, paddingBottom)
    }

    @LynxProp(name = "value")
    fun setValue(value: String) {
        if (value != mView.text.toString()) {
            mView.setText(value)
        }
    }

    @LynxProp(name = "placeholder")
    fun setPlaceholder(value: String) {
        mView.hint = value
    }

    @LynxUIMethod
    fun focus(params: ReadableMap?, callback: Callback) {
        if (mView.requestFocus()) {
            if (showSoftInput()) {
                callback.invoke(LynxUIMethodConstants.SUCCESS)
            } else {
                callback.invoke(LynxUIMethodConstants.UNKNOWN, "fail to show keyboard")
            }
        } else {
            callback.invoke(LynxUIMethodConstants.UNKNOWN, "fail to focus")
        }
    }

    private fun showSoftInput(): Boolean {
        val imm = lynxContext.getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
            ?: return false
        return imm.showSoftInput(mView, InputMethodManager.SHOW_IMPLICIT, null)
    }

    private fun emitEvent(name: String, detail: Map<String, Any>?) {
        val event = LynxCustomEvent(sign, name)
        detail?.forEach { (k, v) -> event.addDetail(k, v) }
        lynxContext.eventEmitter.sendCustomEvent(event)
    }
}
`;
}

