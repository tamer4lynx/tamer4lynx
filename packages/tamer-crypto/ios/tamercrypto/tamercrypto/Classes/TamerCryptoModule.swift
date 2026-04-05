import Foundation
import CryptoKit
import Security
import Lynx

@objcMembers
public final class TamerCryptoModule: NSObject, LynxModule {

    @objc public static var name: String { "TamerCryptoModule" }

    @objc public static var methodLookup: [String: String] {
        [
            "invokeAsync": NSStringFromSelector(#selector(invokeAsync(_:callback:))),
            "getRandomValuesSync": NSStringFromSelector(#selector(getRandomValuesSync(_:))),
            "randomUUIDSync": NSStringFromSelector(#selector(randomUUIDSync))
        ]
    }

    @objc public init(param: Any) { super.init() }
    @objc public override init() { super.init() }

    @objc func getRandomValuesSync(_ length: NSNumber) -> String {
        let n = length.intValue
        precondition(n >= 0 && n <= 65536, "getRandomValuesSync length out of range")
        var bytes = [UInt8](repeating: 0, count: n)
        let status = SecRandomCopyBytes(kSecRandomDefault, n, &bytes)
        precondition(status == errSecSuccess, "SecRandomCopyBytes failed")
        return Data(bytes).base64EncodedString()
    }

    @objc func randomUUIDSync() -> String {
        UUID().uuidString
    }

    @objc func invokeAsync(_ json: String, callback: @escaping (String) -> Void) {
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                guard let data = json.data(using: .utf8),
                      let obj = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                      let op = obj["op"] as? String else {
                    callback("{\"ok\":false,\"error\":\"invalid_json\"}")
                    return
                }
                let result = try self.dispatch(op: op, obj: obj)
                let out: [String: Any] = ["ok": true, "result": result]
                let j = try JSONSerialization.data(withJSONObject: out)
                callback(String(data: j, encoding: .utf8) ?? "{\"ok\":false,\"error\":\"encode\"}")
            } catch {
                let err: [String: Any] = ["ok": false, "error": error.localizedDescription]
                if let j = try? JSONSerialization.data(withJSONObject: err),
                   let s = String(data: j, encoding: .utf8) {
                    callback(s)
                } else {
                    callback("{\"ok\":false,\"error\":\"unknown\"}")
                }
            }
        }
    }

    private func dispatch(op: String, obj: [String: Any]) throws -> [String: Any] {
        switch op {
        case "getRandomValues": return try opGetRandomValues(obj)
        case "randomUUID": return ["uuid": UUID().uuidString]
        case "digest": return try opDigest(obj)
        case "aesGcmEncrypt": return try opAesGcmEncrypt(obj)
        case "aesGcmDecrypt": return try opAesGcmDecrypt(obj)
        case "hmac": return try opHmac(obj)
        case "pbkdf2": return try opPbkdf2(obj)
        case "hkdf": return try opHkdf(obj)
        case "ecdsaP256Sign": return try opEcdsaP256Sign(obj)
        case "ecdsaP256Verify": return try opEcdsaP256Verify(obj)
        case "generateKeyAes": return try opGenerateKeyAes(obj)
        case "generateKeyHmac": return try opGenerateKeyHmac(obj)
        case "generateKeyEcdsaP256": return try opGenerateKeyEcdsaP256(obj)
        case "generateKeyRsaOaep": return try opGenerateKeyRsaOaep(obj)
        case "rsaOaepEncrypt": return try opRsaOaepEncrypt(obj)
        case "rsaOaepDecrypt": return try opRsaOaepDecrypt(obj)
        default: throw NSError(domain: "TamerCrypto", code: 1, userInfo: [NSLocalizedDescriptionKey: "unsupported_op:\(op)"])
        }
    }

    private func opGetRandomValues(_ obj: [String: Any]) throws -> [String: Any] {
        let length = obj["length"] as? Int ?? 0
        if length < 0 || length > 65536 { throw NSError(domain: "TamerCrypto", code: 2, userInfo: [NSLocalizedDescriptionKey: "length_out_of_range"]) }
        var bytes = [UInt8](repeating: 0, count: length)
        let status = SecRandomCopyBytes(kSecRandomDefault, length, &bytes)
        guard status == errSecSuccess else {
            throw NSError(domain: "TamerCrypto", code: 3, userInfo: [NSLocalizedDescriptionKey: "random_failed"])
        }
        return ["bytes": Data(bytes).base64EncodedString()]
    }

    private func opDigest(_ obj: [String: Any]) throws -> [String: Any] {
        let algorithm = obj["algorithm"] as? String ?? ""
        let data = try b64Decode(obj["data"] as? String ?? "")
        let digest: Data
        switch algorithm {
        case "SHA-256": digest = Data(SHA256.hash(data: data))
        case "SHA-384": digest = Data(SHA384.hash(data: data))
        case "SHA-512": digest = Data(SHA512.hash(data: data))
        default: throw NSError(domain: "TamerCrypto", code: 4, userInfo: [NSLocalizedDescriptionKey: "unsupported_digest"])
        }
        return ["digest": digest.base64EncodedString()]
    }

    private func opAesGcmEncrypt(_ obj: [String: Any]) throws -> [String: Any] {
        let key = try b64Decode(obj["key"] as? String ?? "")
        let iv = try b64Decode(obj["iv"] as? String ?? "")
        let plaintext = try b64Decode(obj["plaintext"] as? String ?? "")
        let tagBits = (obj["tagLength"] as? Int) ?? 128
        let aad: Data? = try {
            if let s = obj["additionalData"] as? String, !s.isEmpty { return try b64Decode(s) }
            return nil
        }()
        let sk = SymmetricKey(data: key)
        let nonce = try AES.GCM.Nonce(data: iv)
        let sealed: AES.GCM.SealedBox
        if let a = aad {
            sealed = try AES.GCM.seal(plaintext, using: sk, nonce: nonce, authenticating: a)
        } else {
            sealed = try AES.GCM.seal(plaintext, using: sk, nonce: nonce)
        }
        var combined = sealed.ciphertext
        combined.append(sealed.tag)
        return ["ciphertextAndTag": combined.base64EncodedString()]
    }

    private func opAesGcmDecrypt(_ obj: [String: Any]) throws -> [String: Any] {
        let key = try b64Decode(obj["key"] as? String ?? "")
        let iv = try b64Decode(obj["iv"] as? String ?? "")
        let combined = try b64Decode(obj["ciphertextAndTag"] as? String ?? "")
        let tagLen = ((obj["tagLength"] as? Int) ?? 128) / 8
        guard combined.count >= tagLen else { throw NSError(domain: "TamerCrypto", code: 5, userInfo: [NSLocalizedDescriptionKey: "invalid_gcm"]) }
        let ct = combined.prefix(combined.count - tagLen)
        let tag = combined.suffix(tagLen)
        let sk = SymmetricKey(data: key)
        let nonce = try AES.GCM.Nonce(data: iv)
        let sealed = try AES.GCM.SealedBox(nonce: nonce, ciphertext: ct, tag: tag)
        let aad: Data? = try {
            if let s = obj["additionalData"] as? String, !s.isEmpty { return try b64Decode(s) }
            return nil
        }()
        let plain: Data
        if let a = aad {
            plain = try AES.GCM.open(sealed, using: sk, authenticating: a)
        } else {
            plain = try AES.GCM.open(sealed, using: sk)
        }
        return ["plaintext": plain.base64EncodedString()]
    }

    private func opHmac(_ obj: [String: Any]) throws -> [String: Any] {
        let hash = obj["hash"] as? String ?? ""
        let key = try b64Decode(obj["key"] as? String ?? "")
        let data = try b64Decode(obj["data"] as? String ?? "")
        let sk = SymmetricKey(data: key)
        let macData: Data
        switch hash {
        case "SHA-256":
            macData = Data(HMAC<SHA256>.authenticationCode(for: data, using: sk))
        case "SHA-384":
            macData = Data(HMAC<SHA384>.authenticationCode(for: data, using: sk))
        case "SHA-512":
            macData = Data(HMAC<SHA512>.authenticationCode(for: data, using: sk))
        default:
            throw NSError(domain: "TamerCrypto", code: 6, userInfo: [NSLocalizedDescriptionKey: "unsupported_hmac"])
        }
        return ["signature": macData.base64EncodedString()]
    }

    private func opPbkdf2(_ obj: [String: Any]) throws -> [String: Any] {
        let hash = obj["hash"] as? String ?? ""
        let password = try b64Decode(obj["password"] as? String ?? "")
        let salt = try b64Decode(obj["salt"] as? String ?? "")
        let iterations = UInt32(obj["iterations"] as? Int ?? 0)
        let length = obj["length"] as? Int ?? 0
        if iterations < 1 { throw NSError(domain: "TamerCrypto", code: 7, userInfo: [NSLocalizedDescriptionKey: "invalid_iterations"]) }
        let dk = try pbkdf2(password: password, salt: salt, iterations: iterations, length: length, hash: hash)
        return ["derived": dk.base64EncodedString()]
    }

    private func pbkdf2(password: Data, salt: Data, iterations: UInt32, length: Int, hash: String) throws -> Data {
        let hLen: Int
        let macBlock: (Data, Data) -> Data
        switch hash {
        case "SHA-256":
            hLen = 32
            macBlock = { key, msg in
                let sk = SymmetricKey(data: key)
                return Data(HMAC<SHA256>.authenticationCode(for: msg, using: sk))
            }
        case "SHA-384":
            hLen = 48
            macBlock = { key, msg in
                let sk = SymmetricKey(data: key)
                return Data(HMAC<SHA384>.authenticationCode(for: msg, using: sk))
            }
        case "SHA-512":
            hLen = 64
            macBlock = { key, msg in
                let sk = SymmetricKey(data: key)
                return Data(HMAC<SHA512>.authenticationCode(for: msg, using: sk))
            }
        default:
            throw NSError(domain: "TamerCrypto", code: 8, userInfo: [NSLocalizedDescriptionKey: "unsupported_pbkdf2"])
        }
        var dk = Data(count: length)
        let l = (length + hLen - 1) / hLen
        var dkOffset = 0
        for i in 1...l {
            let iBE = UInt32(i).bigEndian
            let blockData = withUnsafeBytes(of: iBE) { Data($0) }
            var u = macBlock(password, salt + blockData)
            var t = [UInt8](u)
            if iterations > 1 {
                for _ in 2...Int(iterations) {
                    u = macBlock(password, u)
                    let uArr = [UInt8](u)
                    for k in 0..<t.count {
                        t[k] ^= uArr[k]
                    }
                }
            }
            let tData = Data(t)
            let copyLen = Swift.min(hLen, length - dkOffset)
            dk.replaceSubrange(dkOffset..<(dkOffset + copyLen), with: tData.prefix(copyLen))
            dkOffset += copyLen
        }
        return dk
    }

    private func opHkdf(_ obj: [String: Any]) throws -> [String: Any] {
        let hash = obj["hash"] as? String ?? ""
        let ikm = try b64Decode(obj["ikm"] as? String ?? "")
        let salt: Data
        if let s = obj["salt"] as? String, !s.isEmpty {
            salt = try b64Decode(s)
        } else {
            salt = Data()
        }
        let info = try b64Decode(obj["info"] as? String ?? "")
        let length = obj["length"] as? Int ?? 0
        let (hLen, extract): (Int, (Data, Data) -> Data)
        switch hash {
        case "SHA-256":
            hLen = 32
            extract = { s, i in
                let actualSalt = s.isEmpty ? Data(repeating: 0, count: 32) : s
                let sk = SymmetricKey(data: actualSalt)
                return Data(HMAC<SHA256>.authenticationCode(for: i, using: sk))
            }
        case "SHA-384":
            hLen = 48
            extract = { s, i in
                let actualSalt = s.isEmpty ? Data(repeating: 0, count: 48) : s
                let sk = SymmetricKey(data: actualSalt)
                return Data(HMAC<SHA384>.authenticationCode(for: i, using: sk))
            }
        case "SHA-512":
            hLen = 64
            extract = { s, i in
                let actualSalt = s.isEmpty ? Data(repeating: 0, count: 64) : s
                let sk = SymmetricKey(data: actualSalt)
                return Data(HMAC<SHA512>.authenticationCode(for: i, using: sk))
            }
        default:
            throw NSError(domain: "TamerCrypto", code: 9, userInfo: [NSLocalizedDescriptionKey: "unsupported_hkdf"])
        }
        let prk = extract(salt, ikm)
        let okm = try hkdfExpand(prk: prk, info: info, length: length, hLen: hLen, hash: hash)
        return ["derived": okm.base64EncodedString()]
    }

    private func hkdfExpand(prk: Data, info: Data, length: Int, hLen: Int, hash: String) throws -> Data {
        let n = (length + hLen - 1) / hLen
        if n > 255 { throw NSError(domain: "TamerCrypto", code: 10, userInfo: [NSLocalizedDescriptionKey: "hkdf_too_long"]) }
        var okm = Data()
        var tPrev = Data()
        let mac: (Data, Data) -> Data = { key, msg in
            let sk = SymmetricKey(data: key)
            switch hash {
            case "SHA-256": return Data(HMAC<SHA256>.authenticationCode(for: msg, using: sk))
            case "SHA-384": return Data(HMAC<SHA384>.authenticationCode(for: msg, using: sk))
            case "SHA-512": return Data(HMAC<SHA512>.authenticationCode(for: msg, using: sk))
            default: return Data()
            }
        }
        for i in 1...n {
            var msg = tPrev
            msg.append(info)
            msg.append(UInt8(i))
            tPrev = mac(prk, msg)
            okm.append(tPrev)
        }
        return okm.prefix(length)
    }

    private func opEcdsaP256Sign(_ obj: [String: Any]) throws -> [String: Any] {
        let pkcs8 = try b64Decode(obj["privateKeyPkcs8"] as? String ?? "")
        let data = try b64Decode(obj["data"] as? String ?? "")
        let priv = try P256.Signing.PrivateKey(derRepresentation: pkcs8)
        let sig = try priv.signature(for: data)
        return ["signature": sig.derRepresentation.base64EncodedString()]
    }

    private func opEcdsaP256Verify(_ obj: [String: Any]) throws -> [String: Any] {
        let spki = try b64Decode(obj["publicKeySpki"] as? String ?? "")
        let data = try b64Decode(obj["data"] as? String ?? "")
        let sigData = try b64Decode(obj["signature"] as? String ?? "")
        let pub = try P256.Signing.PublicKey(derRepresentation: spki)
        let sig = try P256.Signing.ECDSASignature(derRepresentation: sigData)
        let ok = pub.isValidSignature(sig, for: data)
        return ["valid": ok]
    }

    private func opGenerateKeyAes(_ obj: [String: Any]) throws -> [String: Any] {
        let bits = obj["length"] as? Int ?? 256
        let keyLen = bits / 8
        var bytes = [UInt8](repeating: 0, count: keyLen)
        let status = SecRandomCopyBytes(kSecRandomDefault, keyLen, &bytes)
        guard status == errSecSuccess else { throw NSError(domain: "TamerCrypto", code: 11, userInfo: [NSLocalizedDescriptionKey: "random_failed"]) }
        return ["keyBytes": Data(bytes).base64EncodedString()]
    }

    private func opGenerateKeyHmac(_ obj: [String: Any]) throws -> [String: Any] {
        let bits = obj["length"] as? Int ?? 256
        let keyLen = bits / 8
        var bytes = [UInt8](repeating: 0, count: keyLen)
        let status = SecRandomCopyBytes(kSecRandomDefault, keyLen, &bytes)
        guard status == errSecSuccess else { throw NSError(domain: "TamerCrypto", code: 12, userInfo: [NSLocalizedDescriptionKey: "random_failed"]) }
        return ["keyBytes": Data(bytes).base64EncodedString()]
    }

    private func opGenerateKeyEcdsaP256(_ obj: [String: Any]) throws -> [String: Any] {
        let priv = P256.Signing.PrivateKey()
        let pub = priv.publicKey
        return [
            "privateKeyPkcs8": priv.derRepresentation.base64EncodedString(),
            "publicKeySpki": pub.derRepresentation.base64EncodedString()
        ]
    }

    private func opGenerateKeyRsaOaep(_ obj: [String: Any]) throws -> [String: Any] {
        let modulusLength = obj["modulusLength"] as? Int ?? 2048
        let attrs: [String: Any] = [
            kSecAttrKeyType as String: kSecAttrKeyTypeRSA,
            kSecAttrKeySizeInBits as String: modulusLength,
            kSecPrivateKeyAttrs as String: [
                kSecAttrIsPermanent as String: false
            ]
        ]
        var error: Unmanaged<CFError>?
        guard let priv = SecKeyCreateRandomKey(attrs as CFDictionary, &error) else {
            throw error?.takeRetainedValue() ?? NSError(domain: "TamerCrypto", code: 14, userInfo: nil)
        }
        guard let pub = SecKeyCopyPublicKey(priv) else {
            throw NSError(domain: "TamerCrypto", code: 15, userInfo: [NSLocalizedDescriptionKey: "rsa_pub"])
        }
        var err2: Unmanaged<CFError>?
        guard let privPkcs1 = SecKeyCopyExternalRepresentation(priv, &err2) as Data? else {
            throw err2?.takeRetainedValue() ?? NSError(domain: "TamerCrypto", code: 16, userInfo: nil)
        }
        var err3: Unmanaged<CFError>?
        guard let pubPkcs1 = SecKeyCopyExternalRepresentation(pub, &err3) as Data? else {
            throw err3?.takeRetainedValue() ?? NSError(domain: "TamerCrypto", code: 17, userInfo: nil)
        }
        let pkcs8 = rsaPkcs1PrivateToPkcs8(privPkcs1)
        let spki = rsaPkcs1PublicToSpki(pubPkcs1)
        return [
            "privateKeyPkcs8": pkcs8.base64EncodedString(),
            "publicKeySpki": spki.base64EncodedString()
        ]
    }

    private func opRsaOaepEncrypt(_ obj: [String: Any]) throws -> [String: Any] {
        let spki = try b64Decode(obj["publicKeySpki"] as? String ?? "")
        let data = try b64Decode(obj["data"] as? String ?? "")
        let label: Data
        if let s = obj["label"] as? String, !s.isEmpty {
            label = try b64Decode(s)
        } else {
            label = Data()
        }
        if !label.isEmpty {
            throw NSError(domain: "TamerCrypto", code: 23, userInfo: [NSLocalizedDescriptionKey: "rsa_oaep_label_ios_unsupported"])
        }
        let pub = try rsaSecKeyPublic(spki: spki)
        var err: Unmanaged<CFError>?
        guard let cipher = SecKeyCreateEncryptedData(pub, .rsaEncryptionOAEPSHA256, data as CFData, &err) as Data? else {
            throw err?.takeRetainedValue() ?? NSError(domain: "TamerCrypto", code: 18, userInfo: nil)
        }
        return ["ciphertext": cipher.base64EncodedString()]
    }

    private func opRsaOaepDecrypt(_ obj: [String: Any]) throws -> [String: Any] {
        let pkcs8 = try b64Decode(obj["privateKeyPkcs8"] as? String ?? "")
        let data = try b64Decode(obj["data"] as? String ?? "")
        let label: Data
        if let s = obj["label"] as? String, !s.isEmpty {
            label = try b64Decode(s)
        } else {
            label = Data()
        }
        if !label.isEmpty {
            throw NSError(domain: "TamerCrypto", code: 24, userInfo: [NSLocalizedDescriptionKey: "rsa_oaep_label_ios_unsupported"])
        }
        let priv = try rsaSecKeyPrivate(pkcs8: pkcs8)
        var err: Unmanaged<CFError>?
        guard let plain = SecKeyCreateDecryptedData(priv, .rsaEncryptionOAEPSHA256, data as CFData, &err) as Data? else {
            throw err?.takeRetainedValue() ?? NSError(domain: "TamerCrypto", code: 19, userInfo: nil)
        }
        return ["plaintext": plain.base64EncodedString()]
    }

    private func rsaSecKeyPublic(spki: Data) throws -> SecKey {
        let attrs: [String: Any] = [
            kSecAttrKeyType as String: kSecAttrKeyTypeRSA,
            kSecAttrKeyClass as String: kSecAttrKeyClassPublic,
        ]
        var err: Unmanaged<CFError>?
        guard let key = SecKeyCreateWithData(spki as CFData, attrs as CFDictionary, &err) else {
            throw err?.takeRetainedValue() ?? NSError(domain: "TamerCrypto", code: 20, userInfo: nil)
        }
        return key
    }

    private func rsaSecKeyPrivate(pkcs8: Data) throws -> SecKey {
        let attrs: [String: Any] = [
            kSecAttrKeyType as String: kSecAttrKeyTypeRSA,
            kSecAttrKeyClass as String: kSecAttrKeyClassPrivate,
        ]
        var err: Unmanaged<CFError>?
        guard let key = SecKeyCreateWithData(pkcs8 as CFData, attrs as CFDictionary, &err) else {
            throw err?.takeRetainedValue() ?? NSError(domain: "TamerCrypto", code: 21, userInfo: nil)
        }
        return key
    }

    private func b64Decode(_ s: String) throws -> Data {
        guard let d = Data(base64Encoded: s) else {
            throw NSError(domain: "TamerCrypto", code: 22, userInfo: [NSLocalizedDescriptionKey: "b64"])
        }
        return d
    }
}
