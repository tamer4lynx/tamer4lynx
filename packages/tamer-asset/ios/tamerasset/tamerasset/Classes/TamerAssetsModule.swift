import Foundation
import ImageIO
import Lynx

// MARK: - Cache entry sidecar stored alongside each downloaded file

private struct AssetMeta: Codable {
  var etag: String?
  var lastModified: String?
  var hash: String?
  var mime: String?
  var width: Int?
  var height: Int?
}

// MARK: - TamerAssetsModule

@objcMembers
public final class TamerAssetsModule: NSObject, LynxModule {

  // MARK: LynxModule protocol

  @objc public static var name: String { "TamerAssets" }

  @objc public static var methodLookup: [String: String] {
    [
      "fetch": "fetch:hash:callback:",
      "probe": "probe:callback:",
      "clearCache": "clearCache:",
    ]
  }

  @objc public required init(param: Any) {
    super.init()
  }

  @objc public override init() {
    super.init()
  }

  // MARK: - Cache directory

  private static var cacheDir: URL = {
    let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask).first!
    let dir = caches.appendingPathComponent("tamer-assets", isDirectory: true)
    try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
    return dir
  }()

  private static func cacheKey(uri: String) -> String {
    // SHA256 hex of uri, truncated to 64 chars for filesystem safety
    var hasher = Hasher()
    hasher.combine(uri)
    let hash = abs(hasher.finalize())
    return String(format: "%016x", hash)
  }

  private static func cachedFileURL(key: String, uri: String) -> URL {
    let ext = (uri as NSString).pathExtension
    let filename = ext.isEmpty ? key : "\(key).\(ext)"
    return cacheDir.appendingPathComponent(filename)
  }

  private static func metaURL(key: String) -> URL {
    cacheDir.appendingPathComponent("\(key).meta.json")
  }

  private static func readMeta(key: String) -> AssetMeta? {
    let url = metaURL(key: key)
    guard let data = try? Data(contentsOf: url) else { return nil }
    return try? JSONDecoder().decode(AssetMeta.self, from: data)
  }

  private static func writeMeta(_ meta: AssetMeta, key: String) {
    guard let data = try? JSONEncoder().encode(meta) else { return }
    try? data.write(to: metaURL(key: key), options: .atomic)
  }

  // MARK: - Image dimensions

  private static func probeDimensions(fileURL: URL) -> (width: Int, height: Int)? {
    guard let src = CGImageSourceCreateWithURL(fileURL as CFURL, nil),
          let props = CGImageSourceCopyPropertiesAtIndex(src, 0, nil) as? [CFString: Any],
          let w = props[kCGImagePropertyPixelWidth] as? Int,
          let h = props[kCGImagePropertyPixelHeight] as? Int
    else { return nil }
    return (w, h)
  }

  // MARK: - Lynx-exposed methods

  @objc func fetch(_ uri: String, hash: String?, callback: @escaping LynxCallbackBlock) {
    DispatchQueue.global(qos: .userInitiated).async {
      let key = Self.cacheKey(uri: uri)
      let fileURL = Self.cachedFileURL(key: key, uri: uri)
      let meta = Self.readMeta(key: key)

      // Hash-based hit: if build hash matches cached hash, return immediately
      if let hash = hash, !hash.isEmpty,
         hash == meta?.hash,
         FileManager.default.fileExists(atPath: fileURL.path) {
        let dims = Self.probeDimensions(fileURL: fileURL)
        callback(Self.successResult(
          localUri: fileURL.absoluteString,
          width: dims?.width ?? meta?.width,
          height: dims?.height ?? meta?.height,
          mime: meta?.mime,
          fromCache: true
        ))
        return
      }

      // Build conditional GET headers from sidecar
      var request = URLRequest(url: URL(string: uri)!)
      request.timeoutInterval = 30
      if let etag = meta?.etag {
        request.setValue(etag, forHTTPHeaderField: "If-None-Match")
      }
      if let lm = meta?.lastModified {
        request.setValue(lm, forHTTPHeaderField: "If-Modified-Since")
      }

      let task = URLSession.shared.dataTask(with: request) { data, response, error in
        if let error = error {
          callback(["error": error.localizedDescription])
          return
        }
        guard let http = response as? HTTPURLResponse else {
          callback(["error": "invalid response"])
          return
        }

        if http.statusCode == 304, FileManager.default.fileExists(atPath: fileURL.path) {
          // Not modified — cached file still valid
          let dims = Self.probeDimensions(fileURL: fileURL)
          callback(Self.successResult(
            localUri: fileURL.absoluteString,
            width: dims?.width ?? meta?.width,
            height: dims?.height ?? meta?.height,
            mime: meta?.mime,
            fromCache: true
          ))
          return
        }

        guard http.statusCode == 200, let data = data else {
          callback(["error": "HTTP \(http.statusCode)"])
          return
        }

        do {
          try data.write(to: fileURL, options: .atomic)
        } catch {
          callback(["error": "write failed: \(error.localizedDescription)"])
          return
        }

        let mime = http.mimeType
        var newMeta = AssetMeta(
          etag: http.value(forHTTPHeaderField: "ETag"),
          lastModified: http.value(forHTTPHeaderField: "Last-Modified"),
          hash: hash,
          mime: mime
        )
        let dims = Self.probeDimensions(fileURL: fileURL)
        newMeta.width = dims?.width
        newMeta.height = dims?.height
        Self.writeMeta(newMeta, key: key)

        callback(Self.successResult(
          localUri: fileURL.absoluteString,
          width: dims?.width,
          height: dims?.height,
          mime: mime,
          fromCache: false
        ))
      }
      task.resume()
    }
  }

  @objc func probe(_ localUri: String, callback: @escaping LynxCallbackBlock) {
    DispatchQueue.global(qos: .utility).async {
      let fileURL: URL
      if localUri.hasPrefix("file://") {
        fileURL = URL(string: localUri)!
      } else {
        fileURL = URL(fileURLWithPath: localUri)
      }
      let dims = Self.probeDimensions(fileURL: fileURL)
      var result: [String: Any] = [:]
      if let dims = dims {
        result["width"] = dims.width
        result["height"] = dims.height
      }
      callback(result)
    }
  }

  @objc func clearCache(_ callback: @escaping LynxCallbackBlock) {
    DispatchQueue.global(qos: .utility).async {
      try? FileManager.default.removeItem(at: Self.cacheDir)
      try? FileManager.default.createDirectory(at: Self.cacheDir, withIntermediateDirectories: true)
      callback([:])
    }
  }

  // MARK: - Helpers

  private static func successResult(
    localUri: String,
    width: Int?,
    height: Int?,
    mime: String?,
    fromCache: Bool
  ) -> [String: Any] {
    var r: [String: Any] = ["localUri": localUri, "fromCache": fromCache]
    if let w = width { r["width"] = w }
    if let h = height { r["height"] = h }
    if let m = mime { r["mime"] = m }
    return r
  }
}
