package app.yike.focustimer

import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)
  }

  override fun onWebViewCreate(webView: WebView) {
    // Edge-to-edge draws the app under the status bar, navigation bar and keyboard. Keep the
    // page clear of them by padding the content root; the strips show the root's background,
    // which the page paints to match its own theme through YikeShell.setBars.
    val root = window.decorView.findViewById<View>(android.R.id.content)
    ViewCompat.setOnApplyWindowInsetsListener(root) { view, insets ->
      val bars = insets.getInsets(
        WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout() or WindowInsetsCompat.Type.ime()
      )
      view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
      WindowInsetsCompat.CONSUMED
    }
    ViewCompat.requestApplyInsets(root)
    webView.addJavascriptInterface(ShellBridge(root), "YikeShell")
  }

  private inner class ShellBridge(private val root: View) {
    @JavascriptInterface
    fun setBars(color: String, dark: Boolean) {
      runOnUiThread {
        try { root.setBackgroundColor(Color.parseColor(color)) } catch (_: IllegalArgumentException) {}
        WindowCompat.getInsetsController(window, window.decorView).apply {
          isAppearanceLightStatusBars = !dark
          isAppearanceLightNavigationBars = !dark
        }
      }
    }
  }
}
