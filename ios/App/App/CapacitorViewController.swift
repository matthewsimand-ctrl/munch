import UIKit
import Capacitor

final class CapacitorViewController: CAPBridgeViewController {
    override func viewDidLoad() {
        super.viewDidLoad()

        view.backgroundColor = .systemBackground
        webView?.isOpaque = false
        webView?.backgroundColor = .clear
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
        webView?.scrollView.keyboardDismissMode = .interactive
    }

    override func setStatusBarDefaults() {
        super.setStatusBarDefaults()
        statusBarStyle = .darkContent
    }
}
