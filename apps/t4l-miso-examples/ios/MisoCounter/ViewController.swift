import UIKit
import Lynx
import tamerinsets

class ViewController: UIViewController {
  private var lynxView: LynxView?

  override func viewDidLoad() {
	super.viewDidLoad()
	view.backgroundColor = .black
	edgesForExtendedLayout = .all
	extendedLayoutIncludesOpaqueBars = true
	additionalSafeAreaInsets = .zero
	view.insetsLayoutMarginsFromSafeArea = false
	view.preservesSuperviewLayoutMargins = false
	if #available(iOS 15.0, *) {
		viewRespectsSystemMinimumLayoutMargins = false
	}
  }

  override func viewDidLayoutSubviews() {
	super.viewDidLayoutSubviews()
	guard view.bounds.width > 0, view.bounds.height > 0 else { return }
	if lynxView == nil {
	  setupLynxView()
	} else {
	  applyFullscreenLayout(to: lynxView!)
	}
  }

  override func viewSafeAreaInsetsDidChange() {
	super.viewSafeAreaInsetsDidChange()
	TamerInsetsModule.reRequestInsets()
  }

  override var preferredStatusBarStyle: UIStatusBarStyle { .lightContent }

  private func buildLynxView() -> LynxView {
	let bounds = view.bounds
	let lv = LynxView { builder in
	  builder.config = LynxConfig(provider: LynxProvider())
	  builder.screenSize = bounds.size
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
	self.lynxView = lv
  }

  private func applyFullscreenLayout(to lynxView: LynxView) {
	let bounds = view.bounds
	let size = bounds.size
	lynxView.frame = bounds
	lynxView.updateScreenMetrics(withWidth: size.width, height: size.height)
	lynxView.updateViewport(withPreferredLayoutWidth: size.width, preferredLayoutHeight: size.height, needLayout: true)
	lynxView.preferredLayoutWidth = size.width
	lynxView.preferredLayoutHeight = size.height
	lynxView.layoutWidthMode = .exact
	lynxView.layoutHeightMode = .exact
  }
}
	