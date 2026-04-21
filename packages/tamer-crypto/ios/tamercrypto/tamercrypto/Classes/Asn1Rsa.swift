import Foundation

private func derLength(_ n: Int) -> Data {
    if n < 128 {
        return Data([UInt8(n)])
    }
    var bytes = [UInt8]()
    var v = n
    while v > 0 {
        bytes.insert(UInt8(v & 0xff), at: 0)
        v >>= 8
    }
    return Data([0x80 | UInt8(bytes.count)] + bytes)
}

private func derWrap(_ tag: UInt8, _ content: Data) -> Data {
    Data([tag]) + derLength(content.count) + content
}

private func derOctetString(_ data: Data) -> Data {
    derWrap(0x04, data)
}

private func derBitString(_ data: Data) -> Data {
    derWrap(0x03, Data([0x00]) + data)
}

private func derSequence(_ parts: Data...) -> Data {
    let content = parts.reduce(Data(), +)
    return derWrap(0x30, content)
}

private func derInteger(_ value: UInt8) -> Data {
    Data([0x02, 0x01, value])
}

private func derObjectIdentifier(_ bytes: [UInt8]) -> Data {
    derWrap(0x06, Data(bytes))
}

private func derContextSpecific(_ index: UInt8, _ content: Data) -> Data {
    derWrap(UInt8(0xa0) | index, content)
}

private let rsaAlgorithmIdentifier = Data([0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00])
private let ecPublicKeyAlgorithmOid: [UInt8] = [0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01]
private let prime256v1Oid: [UInt8] = [0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07]
private let p256AlgorithmIdentifier = derSequence(
    derObjectIdentifier(ecPublicKeyAlgorithmOid),
    derObjectIdentifier(prime256v1Oid)
)

private func tamerCryptoAsn1Error(_ message: String) -> NSError {
    NSError(domain: "TamerCrypto", code: 25, userInfo: [NSLocalizedDescriptionKey: message])
}

private struct DerReader {
    let data: Data
    private(set) var index: Int = 0

    var isAtEnd: Bool {
        index == data.count
    }

    mutating func readElement() throws -> (tag: UInt8, value: Data) {
        guard index < data.count else {
            throw tamerCryptoAsn1Error("asn1_truncated")
        }

        let tag = data[index]
        index += 1

        guard index < data.count else {
            throw tamerCryptoAsn1Error("asn1_missing_length")
        }

        let lengthByte = data[index]
        index += 1

        let length: Int
        if lengthByte & 0x80 == 0 {
            length = Int(lengthByte)
        } else {
            let byteCount = Int(lengthByte & 0x7f)
            guard byteCount > 0, byteCount <= 4, index + byteCount <= data.count else {
                throw tamerCryptoAsn1Error("asn1_invalid_length")
            }
            var parsedLength = 0
            for _ in 0..<byteCount {
                parsedLength = (parsedLength << 8) | Int(data[index])
                index += 1
            }
            length = parsedLength
        }

        guard index + length <= data.count else {
            throw tamerCryptoAsn1Error("asn1_value_overflow")
        }

        let value = data.subdata(in: index..<(index + length))
        index += length
        return (tag, value)
    }

    mutating func read(_ expectedTag: UInt8) throws -> Data {
        let (tag, value) = try readElement()
        guard tag == expectedTag else {
            throw tamerCryptoAsn1Error("asn1_unexpected_tag_\(tag)")
        }
        return value
    }
}

private func validateP256AlgorithmIdentifier(_ data: Data) throws {
    var reader = DerReader(data: data)
    let algorithmOid = try reader.read(0x06)
    guard algorithmOid == Data(ecPublicKeyAlgorithmOid) else {
        throw tamerCryptoAsn1Error("unsupported_ec_algorithm")
    }

    let curveOid = try reader.read(0x06)
    guard curveOid == Data(prime256v1Oid) else {
        throw tamerCryptoAsn1Error("unsupported_ec_curve")
    }

    guard reader.isAtEnd else {
        throw tamerCryptoAsn1Error("asn1_trailing_algorithm_data")
    }
}

func rsaPkcs1PrivateToPkcs8(_ pkcs1Private: Data) -> Data {
    let version = Data([0x02, 0x01, 0x00])
    let privateOctet = derOctetString(pkcs1Private)
    return derSequence(version + rsaAlgorithmIdentifier + privateOctet)
}

func rsaPkcs1PublicToSpki(_ pkcs1Public: Data) -> Data {
    let alg = rsaAlgorithmIdentifier
    let bitString = derBitString(pkcs1Public)
    return derSequence(alg + bitString)
}

func p256PrivateKeyRawToPkcs8(_ rawPrivateKey: Data, publicKeyX963: Data) -> Data {
    let sec1PrivateKey = derSequence(
        derInteger(0x01),
        derOctetString(rawPrivateKey),
        derContextSpecific(0x00, derObjectIdentifier(prime256v1Oid)),
        derContextSpecific(0x01, derBitString(publicKeyX963))
    )

    return derSequence(
        derInteger(0x00),
        p256AlgorithmIdentifier,
        derOctetString(sec1PrivateKey)
    )
}

func p256PublicKeyX963ToSpki(_ publicKeyX963: Data) -> Data {
    derSequence(p256AlgorithmIdentifier, derBitString(publicKeyX963))
}

func p256PrivateKeyRawFromPkcs8(_ pkcs8: Data) throws -> Data {
    var outerReader = DerReader(data: pkcs8)
    let outerSequence = try outerReader.read(0x30)
    guard outerReader.isAtEnd else {
        throw tamerCryptoAsn1Error("asn1_trailing_pkcs8_data")
    }

    var pkcs8Reader = DerReader(data: outerSequence)
    _ = try pkcs8Reader.read(0x02)
    let algorithmIdentifier = try pkcs8Reader.read(0x30)
    try validateP256AlgorithmIdentifier(algorithmIdentifier)
    let privateKey = try pkcs8Reader.read(0x04)

    var sec1EnvelopeReader = DerReader(data: privateKey)
    let sec1Sequence = try sec1EnvelopeReader.read(0x30)
    guard sec1EnvelopeReader.isAtEnd else {
        throw tamerCryptoAsn1Error("asn1_trailing_sec1_wrapper")
    }

    var sec1Reader = DerReader(data: sec1Sequence)
    _ = try sec1Reader.read(0x02)
    let rawPrivateKey = try sec1Reader.read(0x04)
    guard rawPrivateKey.count == 32 else {
        throw tamerCryptoAsn1Error("invalid_p256_private_key_size")
    }

    return rawPrivateKey
}

func p256PublicKeyX963FromSpki(_ spki: Data) throws -> Data {
    var outerReader = DerReader(data: spki)
    let outerSequence = try outerReader.read(0x30)
    guard outerReader.isAtEnd else {
        throw tamerCryptoAsn1Error("asn1_trailing_spki_data")
    }

    var spkiReader = DerReader(data: outerSequence)
    let algorithmIdentifier = try spkiReader.read(0x30)
    try validateP256AlgorithmIdentifier(algorithmIdentifier)
    let bitString = try spkiReader.read(0x03)
    guard let unusedBits = bitString.first, unusedBits == 0 else {
        throw tamerCryptoAsn1Error("invalid_spki_bit_string")
    }

    let publicKeyX963 = Data(bitString.dropFirst())
    guard publicKeyX963.count == 65, publicKeyX963.first == 0x04 else {
        throw tamerCryptoAsn1Error("invalid_p256_public_key")
    }

    return publicKeyX963
}
