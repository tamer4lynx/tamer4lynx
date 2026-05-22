export function getDevServerPrefs(vars: { packageName: string }): string {
  return `package ${vars.packageName}

import android.content.Context
import android.content.SharedPreferences
import java.security.MessageDigest
import org.json.JSONArray

object DevServerPrefs {
    private const val PREFS = "tamer_dev_server"
    private const val KEY_URL = "dev_server_url"
    private const val KEY_RECENT = "dev_server_recent"

    fun getUrl(context: Context): String? {
        return prefs(context).getString(KEY_URL, null)
    }

    /**
     * Lynx caches ILynxViewGroup by URL key. Using a fixed "main.lynx.bundle" made the first dev
     * server win forever after URL changes. Prefix with a stable id derived from the saved URL.
     */
    fun projectLynxTemplateKey(context: Context): String {
        if (!BuildConfig.DEBUG) return "main.lynx.bundle"
        val u = getUrl(context)?.trim() ?: return "main.lynx.bundle"
        if (u.isEmpty()) return "main.lynx.bundle"
        return sha12Hex(u) + "/main.lynx.bundle"
    }

    private fun sha12Hex(s: String): String {
        return try {
            val md = MessageDigest.getInstance("SHA-256")
            val d = md.digest(s.toByteArray(Charsets.UTF_8))
            buildString(12) {
                for (i in 0 until 6) {
                    append(String.format("%02x", d[i].toInt() and 0xff))
                }
            }
        } catch (_: Exception) {
            "000000000000"
        }
    }

    fun setUrl(context: Context, url: String) {
        prefs(context).edit().putString(KEY_URL, url).apply()
        addRecent(context, url)
    }

    fun getRecentUrls(context: Context): List<String> {
        val json = prefs(context).getString(KEY_RECENT, "[]") ?: "[]"
        return try {
            val arr = JSONArray(json)
            (0 until arr.length()).map { arr.getString(it) }.distinct().take(10)
        } catch (_: Exception) { emptyList() }
    }

    fun addRecent(context: Context, url: String) {
        val current = getRecentUrls(context).filter { it != url }
        val updated = listOf(url) + current
        prefs(context).edit()
            .putString(KEY_RECENT, JSONArray(updated.take(10)).toString())
            .apply()
    }

    fun clear(context: Context) {
        prefs(context).edit().clear().apply()
    }

    private fun prefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    }
}
`;
}
