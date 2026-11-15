# MainActivity exposes YikeShell.setBars to the page; keep it through R8.
-keepattributes JavascriptInterface
-keepclassmembers class app.yike.focustimer.MainActivity$ShellBridge {
    @android.webkit.JavascriptInterface <methods>;
}
