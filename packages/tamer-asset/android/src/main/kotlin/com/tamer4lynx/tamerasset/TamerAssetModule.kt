package com.tamer4lynx.tamerasset

import android.content.Context
import android.graphics.BitmapFactory
import com.lynx.jsbridge.LynxMethod
import com.lynx.jsbridge.LynxModule
import com.lynx.react.bridge.Callback
import com.lynx.react.bridge.JavaOnlyMap
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.File
import java.security.MessageDigest

class TamerAssetModule(context: Context) : LynxModule(context) {

    private val appContext: Context = context.applicationContext
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private val http = OkHttpClient.Builder()
        .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
        .readTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
        .build()

    private val cacheDir: File by lazy {
        File(appContext.cacheDir, "tamer-assets").also { it.mkdirs() }
    }

    // MARK: - Cache helpers

    private fun cacheKey(uri: String): String {
        val md = MessageDigest.getInstance("SHA-256")
        val bytes = md.digest(uri.toByteArray(Charsets.UTF_8))
        return bytes.take(8).joinToString("") { "%02x".format(it) }
    }

    private fun cachedFile(key: String, uri: String): File {
        val ext = uri.substringAfterLast('.').takeIf { it.length in 2..5 && !it.contains('/') } ?: ""
        val name = if (ext.isEmpty()) key else "$key.$ext"
        return File(cacheDir, name)
    }

    private fun metaFile(key: String) = File(cacheDir, "$key.meta.json")

    private fun readMeta(key: String): JSONObject? {
        return try { JSONObject(metaFile(key).readText()) } catch (_: Exception) { null }
    }

    private fun writeMeta(key: String, obj: JSONObject) {
        try { metaFile(key).writeText(obj.toString()) } catch (_: Exception) {}
    }

    // MARK: - Dimension probe (no full decode)

    private fun probeDimensions(file: File): Pair<Int, Int>? {
        return try {
            val opts = BitmapFactory.Options().apply { inJustDecodeBounds = true }
            BitmapFactory.decodeFile(file.absolutePath, opts)
            if (opts.outWidth > 0 && opts.outHeight > 0) opts.outWidth to opts.outHeight else null
        } catch (_: Exception) { null }
    }

    // MARK: - Exposed methods

    @LynxMethod
    fun fetch(uri: String, hash: String?, callback: Callback) {
        scope.launch {
            val key = cacheKey(uri)
            val file = cachedFile(key, uri)
            val meta = readMeta(key)

            // Hash hit: build hash matches cached hash and file exists
            if (!hash.isNullOrEmpty() && hash == meta?.optString("hash") && file.exists()) {
                val dims = probeDimensions(file)
                callback.invoke(buildResult(
                    localUri = "file://${file.absolutePath}",
                    width = dims?.first ?: meta.optInt("width").takeIf { it > 0 },
                    height = dims?.second ?: meta.optInt("height").takeIf { it > 0 },
                    mime = meta.optString("mime").ifEmpty { null },
                    fromCache = true
                ))
                return@launch
            }

            // Conditional GET
            val reqBuilder = Request.Builder().url(uri)
            meta?.optString("etag")?.ifEmpty { null }?.let { reqBuilder.header("If-None-Match", it) }
            meta?.optString("lastModified")?.ifEmpty { null }?.let { reqBuilder.header("If-Modified-Since", it) }

            try {
                val resp = http.newCall(reqBuilder.build()).execute()
                if (resp.code == 304 && file.exists()) {
                    // Not modified
                    val dims = probeDimensions(file)
                    callback.invoke(buildResult(
                        localUri = "file://${file.absolutePath}",
                        width = dims?.first ?: meta?.optInt("width")?.takeIf { it > 0 },
                        height = dims?.second ?: meta?.optInt("height")?.takeIf { it > 0 },
                        mime = meta?.optString("mime")?.ifEmpty { null },
                        fromCache = true
                    ))
                    return@launch
                }
                if (resp.code != 200) {
                    callback.invoke(buildError("HTTP ${resp.code}"))
                    return@launch
                }

                val bytes = resp.body?.bytes() ?: run {
                    callback.invoke(buildError("empty body"))
                    return@launch
                }
                file.writeBytes(bytes)

                val mime = resp.header("Content-Type")?.substringBefore(';')?.trim()
                val newMeta = JSONObject().apply {
                    put("etag", resp.header("ETag") ?: "")
                    put("lastModified", resp.header("Last-Modified") ?: "")
                    put("hash", hash ?: "")
                    put("mime", mime ?: "")
                }
                val dims = probeDimensions(file)
                dims?.let { newMeta.put("width", it.first); newMeta.put("height", it.second) }
                writeMeta(key, newMeta)

                callback.invoke(buildResult(
                    localUri = "file://${file.absolutePath}",
                    width = dims?.first,
                    height = dims?.second,
                    mime = mime,
                    fromCache = false
                ))
            } catch (e: Exception) {
                callback.invoke(buildError(e.message ?: "network error"))
            }
        }
    }

    @LynxMethod
    fun probe(localUri: String, callback: Callback) {
        scope.launch {
            val path = if (localUri.startsWith("file://")) localUri.removePrefix("file://") else localUri
            val dims = probeDimensions(File(path))
            val map = JavaOnlyMap()
            dims?.let { map.putInt("width", it.first); map.putInt("height", it.second) }
            callback.invoke(map)
        }
    }

    @LynxMethod
    fun clearCache(callback: Callback) {
        scope.launch {
            cacheDir.deleteRecursively()
            cacheDir.mkdirs()
            callback.invoke(JavaOnlyMap())
        }
    }

    // MARK: - Result builders

    private fun buildResult(
        localUri: String,
        width: Int?,
        height: Int?,
        mime: String?,
        fromCache: Boolean
    ): JavaOnlyMap {
        val map = JavaOnlyMap()
        map.putString("localUri", localUri)
        map.putBoolean("fromCache", fromCache)
        width?.let { map.putInt("width", it) }
        height?.let { map.putInt("height", it) }
        mime?.let { map.putString("mime", it) }
        return map
    }

    private fun buildError(message: String): JavaOnlyMap {
        val map = JavaOnlyMap()
        map.putString("error", message)
        return map
    }
}
