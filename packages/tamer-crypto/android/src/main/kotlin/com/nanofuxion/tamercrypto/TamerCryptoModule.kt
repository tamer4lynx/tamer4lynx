package com.nanofuxion.tamercrypto

import android.content.Context
import android.util.Base64
import com.lynx.jsbridge.LynxMethod
import com.lynx.jsbridge.LynxModule
import com.lynx.react.bridge.Callback
import org.json.JSONObject
import java.math.BigInteger
import java.security.KeyFactory
import java.security.KeyPairGenerator
import java.security.MessageDigest
import java.security.SecureRandom
import java.security.Signature
import java.security.spec.ECGenParameterSpec
import java.security.spec.MGF1ParameterSpec
import java.security.spec.PKCS8EncodedKeySpec
import java.security.spec.RSAKeyGenParameterSpec
import java.security.spec.X509EncodedKeySpec
import java.util.UUID
import javax.crypto.Cipher
import javax.crypto.Mac
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.OAEPParameterSpec
import javax.crypto.spec.SecretKeySpec

class TamerCryptoModule(context: Context) : LynxModule(context) {

    @LynxMethod
    fun getRandomValuesSync(length: Int): String {
        if (length < 0 || length > 65536) throw IllegalArgumentException("length_out_of_range")
        val bytes = ByteArray(length)
        SecureRandom().nextBytes(bytes)
        return b64Encode(bytes)
    }

    @LynxMethod
    fun randomUUIDSync(): String = UUID.randomUUID().toString()

    @LynxMethod
    fun invokeAsync(json: String, callback: Callback) {
        Thread {
            try {
                val obj = JSONObject(json)
                val result = dispatch(obj)
                callback.invoke(JSONObject().put("ok", true).put("result", result).toString())
            } catch (e: Exception) {
                callback.invoke(
                    JSONObject().put("ok", false).put("error", e.message ?: "unknown_error").toString()
                )
            }
        }.start()
    }

    private fun dispatch(obj: JSONObject): JSONObject {
        return when (val op = obj.getString("op")) {
            "getRandomValues" -> opGetRandomValues(obj)
            "randomUUID" -> JSONObject().put("uuid", UUID.randomUUID().toString())
            "digest" -> opDigest(obj)
            "aesGcmEncrypt" -> opAesGcmEncrypt(obj)
            "aesGcmDecrypt" -> opAesGcmDecrypt(obj)
            "hmac" -> opHmac(obj)
            "pbkdf2" -> opPbkdf2(obj)
            "hkdf" -> opHkdf(obj)
            "ecdsaP256Sign" -> opEcdsaP256Sign(obj)
            "ecdsaP256Verify" -> opEcdsaP256Verify(obj)
            "generateKeyAes" -> opGenerateKeyAes(obj)
            "generateKeyHmac" -> opGenerateKeyHmac(obj)
            "generateKeyEcdsaP256" -> opGenerateKeyEcdsaP256(obj)
            "generateKeyRsaOaep" -> opGenerateKeyRsaOaep(obj)
            "rsaOaepEncrypt" -> opRsaOaepEncrypt(obj)
            "rsaOaepDecrypt" -> opRsaOaepDecrypt(obj)
            else -> throw IllegalArgumentException("unsupported_op:$op")
        }
    }

    private fun opGetRandomValues(obj: JSONObject): JSONObject {
        val length = obj.getInt("length")
        if (length < 0 || length > 65536) throw IllegalArgumentException("length_out_of_range")
        val bytes = ByteArray(length)
        SecureRandom().nextBytes(bytes)
        return JSONObject().put("bytes", b64Encode(bytes))
    }

    private fun opDigest(obj: JSONObject): JSONObject {
        val algorithm = obj.getString("algorithm")
        val data = b64Decode(obj.getString("data"))
        val md = MessageDigest.getInstance(
            when (algorithm) {
                "SHA-256" -> "SHA-256"
                "SHA-384" -> "SHA-384"
                "SHA-512" -> "SHA-512"
                else -> throw IllegalArgumentException("unsupported_digest:$algorithm")
            }
        )
        return JSONObject().put("digest", b64Encode(md.digest(data)))
    }

    private fun opAesGcmEncrypt(obj: JSONObject): JSONObject {
        val key = b64Decode(obj.getString("key"))
        val iv = b64Decode(obj.getString("iv"))
        val plaintext = b64Decode(obj.getString("plaintext"))
        val tagLengthBits = if (obj.has("tagLength")) obj.getInt("tagLength") else 128
        val aad = if (obj.has("additionalData") && !obj.isNull("additionalData")) {
            b64Decode(obj.getString("additionalData"))
        } else null
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        val spec = GCMParameterSpec(tagLengthBits, iv)
        cipher.init(Cipher.ENCRYPT_MODE, SecretKeySpec(key, "AES"), spec)
        if (aad != null) cipher.updateAAD(aad)
        val combined = cipher.doFinal(plaintext)
        return JSONObject().put("ciphertextAndTag", b64Encode(combined))
    }

    private fun opAesGcmDecrypt(obj: JSONObject): JSONObject {
        val key = b64Decode(obj.getString("key"))
        val iv = b64Decode(obj.getString("iv"))
        val ciphertextAndTag = b64Decode(obj.getString("ciphertextAndTag"))
        val tagLengthBits = if (obj.has("tagLength")) obj.getInt("tagLength") else 128
        val aad = if (obj.has("additionalData") && !obj.isNull("additionalData")) {
            b64Decode(obj.getString("additionalData"))
        } else null
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        val spec = GCMParameterSpec(tagLengthBits, iv)
        cipher.init(Cipher.DECRYPT_MODE, SecretKeySpec(key, "AES"), spec)
        if (aad != null) cipher.updateAAD(aad)
        val plain = cipher.doFinal(ciphertextAndTag)
        return JSONObject().put("plaintext", b64Encode(plain))
    }

    private fun opHmac(obj: JSONObject): JSONObject {
        val hash = obj.getString("hash")
        val macAlgo = when (hash) {
            "SHA-256" -> "HmacSHA256"
            "SHA-384" -> "HmacSHA384"
            "SHA-512" -> "HmacSHA512"
            else -> throw IllegalArgumentException("unsupported_hmac:$hash")
        }
        val key = b64Decode(obj.getString("key"))
        val data = b64Decode(obj.getString("data"))
        val mac = Mac.getInstance(macAlgo)
        mac.init(SecretKeySpec(key, macAlgo))
        return JSONObject().put("signature", b64Encode(mac.doFinal(data)))
    }

    private fun opPbkdf2(obj: JSONObject): JSONObject {
        val hash = obj.getString("hash")
        val password = b64Decode(obj.getString("password"))
        val salt = b64Decode(obj.getString("salt"))
        val iterations = obj.getInt("iterations")
        val length = obj.getInt("length")
        if (iterations < 1) throw IllegalArgumentException("invalid_iterations")
        val dk = pbkdf2(password, salt, iterations, length, hash)
        return JSONObject().put("derived", b64Encode(dk))
    }

    private fun opHkdf(obj: JSONObject): JSONObject {
        val hash = obj.getString("hash")
        val ikm = b64Decode(obj.getString("ikm"))
        val salt = if (obj.has("salt") && !obj.isNull("salt")) b64Decode(obj.getString("salt")) else ByteArray(0)
        val info = b64Decode(obj.getString("info"))
        val length = obj.getInt("length")
        val (hmacName, hLen) = when (hash) {
            "SHA-256" -> Pair("HmacSHA256", 32)
            "SHA-384" -> Pair("HmacSHA384", 48)
            "SHA-512" -> Pair("HmacSHA512", 64)
            else -> throw IllegalArgumentException("unsupported_hkdf_hash:$hash")
        }
        val prk = hkdfExtract(hmacName, salt, ikm, hLen)
        val okm = hkdfExpand(hmacName, prk, info, length, hLen)
        return JSONObject().put("derived", b64Encode(okm))
    }

    private fun hkdfExtract(hmacName: String, salt: ByteArray, ikm: ByteArray, hLen: Int): ByteArray {
        val actualSalt = if (salt.isEmpty()) ByteArray(hLen) { 0 } else salt
        val mac = Mac.getInstance(hmacName)
        mac.init(SecretKeySpec(actualSalt, hmacName))
        return mac.doFinal(ikm)
    }

    private fun hkdfExpand(hmacName: String, prk: ByteArray, info: ByteArray, length: Int, hLen: Int): ByteArray {
        val n = (length + hLen - 1) / hLen
        if (n > 255) throw IllegalArgumentException("hkdf_length_too_large")
        val mac = Mac.getInstance(hmacName)
        val okm = ByteArray(length)
        var offset = 0
        var tPrev = ByteArray(0)
        for (i in 1..n) {
            mac.init(SecretKeySpec(prk, hmacName))
            mac.update(tPrev)
            mac.update(info)
            mac.update(i.toByte())
            tPrev = mac.doFinal()
            val copyLen = kotlin.math.min(hLen, length - offset)
            System.arraycopy(tPrev, 0, okm, offset, copyLen)
            offset += copyLen
        }
        return okm
    }

    private fun pbkdf2(password: ByteArray, salt: ByteArray, iterations: Int, length: Int, hash: String): ByteArray {
        val (macAlgo, hLen) = when (hash) {
            "SHA-256" -> Pair("HmacSHA256", 32)
            "SHA-384" -> Pair("HmacSHA384", 48)
            "SHA-512" -> Pair("HmacSHA512", 64)
            else -> throw IllegalArgumentException("unsupported_pbkdf2_hash:$hash")
        }
        val dk = ByteArray(length)
        val l = (length + hLen - 1) / hLen
        var dkOffset = 0
        val block = ByteArray(4)
        for (i in 1..l) {
            block[0] = (i shr 24).toByte()
            block[1] = (i shr 16).toByte()
            block[2] = (i shr 8).toByte()
            block[3] = i.toByte()
            val mac = Mac.getInstance(macAlgo)
            mac.init(SecretKeySpec(password, macAlgo))
            mac.update(salt)
            mac.update(block)
            var u = mac.doFinal()
            var t = u.copyOf()
            for (j in 2..iterations) {
                val m = Mac.getInstance(macAlgo)
                m.init(SecretKeySpec(password, macAlgo))
                u = m.doFinal(u)
                for (k in t.indices) t[k] = (t[k].toInt() xor u[k].toInt()).toByte()
            }
            val copyLen = kotlin.math.min(hLen, length - dkOffset)
            System.arraycopy(t, 0, dk, dkOffset, copyLen)
            dkOffset += copyLen
        }
        return dk
    }

    private fun opEcdsaP256Sign(obj: JSONObject): JSONObject {
        val keyBytes = b64Decode(obj.getString("privateKeyPkcs8"))
        val data = b64Decode(obj.getString("data"))
        val kf = KeyFactory.getInstance("EC")
        val priv = kf.generatePrivate(PKCS8EncodedKeySpec(keyBytes))
        val sig = Signature.getInstance("SHA256withECDSA")
        sig.initSign(priv)
        sig.update(data)
        return JSONObject().put("signature", b64Encode(sig.sign()))
    }

    private fun opEcdsaP256Verify(obj: JSONObject): JSONObject {
        val keyBytes = b64Decode(obj.getString("publicKeySpki"))
        val data = b64Decode(obj.getString("data"))
        val signature = b64Decode(obj.getString("signature"))
        val kf = KeyFactory.getInstance("EC")
        val pub = kf.generatePublic(X509EncodedKeySpec(keyBytes))
        val sig = Signature.getInstance("SHA256withECDSA")
        sig.initVerify(pub)
        sig.update(data)
        return JSONObject().put("valid", sig.verify(signature))
    }

    private fun opGenerateKeyAes(obj: JSONObject): JSONObject {
        val lengthBits = obj.getInt("length")
        val keyLen = lengthBits / 8
        val key = ByteArray(keyLen)
        SecureRandom().nextBytes(key)
        return JSONObject().put("keyBytes", b64Encode(key))
    }

    private fun opGenerateKeyHmac(obj: JSONObject): JSONObject {
        val lengthBits = obj.getInt("length")
        val keyLen = lengthBits / 8
        val key = ByteArray(keyLen)
        SecureRandom().nextBytes(key)
        return JSONObject().put("keyBytes", b64Encode(key))
    }

    private fun opGenerateKeyEcdsaP256(obj: JSONObject): JSONObject {
        val kpg = KeyPairGenerator.getInstance("EC")
        kpg.initialize(ECGenParameterSpec("secp256r1"))
        val pair = kpg.generateKeyPair()
        return JSONObject()
            .put("privateKeyPkcs8", b64Encode(pair.private.encoded))
            .put("publicKeySpki", b64Encode(pair.public.encoded))
    }

    private fun opGenerateKeyRsaOaep(obj: JSONObject): JSONObject {
        val modulusLength = obj.getInt("modulusLength")
        val exp = BigInteger.valueOf(65537)
        val kpg = KeyPairGenerator.getInstance("RSA")
        kpg.initialize(RSAKeyGenParameterSpec(modulusLength, exp))
        val pair = kpg.generateKeyPair()
        return JSONObject()
            .put("privateKeyPkcs8", b64Encode(pair.private.encoded))
            .put("publicKeySpki", b64Encode(pair.public.encoded))
    }

    private fun opRsaOaepEncrypt(obj: JSONObject): JSONObject {
        val keyBytes = b64Decode(obj.getString("publicKeySpki"))
        val data = b64Decode(obj.getString("data"))
        val label = if (obj.has("label") && !obj.isNull("label")) {
            b64Decode(obj.getString("label"))
        } else ByteArray(0)
        val kf = KeyFactory.getInstance("RSA")
        val pub = kf.generatePublic(X509EncodedKeySpec(keyBytes))
        val cipher = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding")
        val oaep = OAEPParameterSpec("SHA-256", "MGF1", MGF1ParameterSpec.SHA256, javax.crypto.spec.PSource.PSpecified(label))
        cipher.init(Cipher.ENCRYPT_MODE, pub, oaep)
        return JSONObject().put("ciphertext", b64Encode(cipher.doFinal(data)))
    }

    private fun opRsaOaepDecrypt(obj: JSONObject): JSONObject {
        val keyBytes = b64Decode(obj.getString("privateKeyPkcs8"))
        val data = b64Decode(obj.getString("data"))
        val label = if (obj.has("label") && !obj.isNull("label")) {
            b64Decode(obj.getString("label"))
        } else ByteArray(0)
        val kf = KeyFactory.getInstance("RSA")
        val priv = kf.generatePrivate(PKCS8EncodedKeySpec(keyBytes))
        val cipher = Cipher.getInstance("RSA/ECB/OAEPWithSHA-256AndMGF1Padding")
        val oaep = OAEPParameterSpec("SHA-256", "MGF1", MGF1ParameterSpec.SHA256, javax.crypto.spec.PSource.PSpecified(label))
        cipher.init(Cipher.DECRYPT_MODE, priv, oaep)
        return JSONObject().put("plaintext", b64Encode(cipher.doFinal(data)))
    }

    private fun b64Encode(b: ByteArray): String {
        return Base64.encodeToString(b, Base64.NO_WRAP)
    }

    private fun b64Decode(s: String): ByteArray {
        return Base64.decode(s, Base64.NO_WRAP)
    }
}
