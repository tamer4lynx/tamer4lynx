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

private let rsaAlgorithmIdentifier = Data([0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00])

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
