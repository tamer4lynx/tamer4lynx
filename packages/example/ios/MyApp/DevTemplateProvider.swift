import Foundation
import Lynx
import tamerdevclient

class DevTemplateProvider: NSObject, LynxTemplateProvider {
    private static let devClientBundle = "dev-client.lynx.bundle"

    func loadTemplate(withUrl url: String!, onComplete callback: LynxTemplateLoadBlock!) {
        DispatchQueue.global(qos: .background).async {
            if url == Self.devClientBundle || url?.hasSuffix("/" + Self.devClientBundle) == true {
                self.loadFromBundle(url: Self.devClientBundle, callback: callback)
                return
            }

            if let devUrl = DevServerPrefs.getUrl(), !devUrl.isEmpty {
                let origin: String
                if let parsed = URL(string: devUrl) {
                    let scheme = parsed.scheme ?? "http"
                    let host = parsed.host ?? "localhost"
                    let port = parsed.port.map { ":\($0)" } ?? ""
                    origin = "\(scheme)://\(host)\(port)"
                } else {
                    origin = devUrl
                }

                let candidates = ["/\(url!)", "/example/\(url!)"]
                for candidate in candidates {
                    if let data = self.httpFetch(url: origin + candidate) {
                        callback?(data, nil)
                        return
                    }
                }
            }

            self.loadFromBundle(url: url, callback: callback)
        }
    }

    private func loadFromBundle(url: String?, callback: LynxTemplateLoadBlock!) {
        guard let url = url,
              let bundleUrl = Bundle.main.url(forResource: url, withExtension: nil),
              let data = try? Data(contentsOf: bundleUrl) else {
            let err = NSError(domain: "DevTemplateProvider", code: 404,
                              userInfo: [NSLocalizedDescriptionKey: "Bundle not found: \(url ?? "nil")"])
            callback?(nil, err)
            return
        }
        callback?(data, nil)
    }

    private func httpFetch(url: String) -> Data? {
        guard let u = URL(string: url) else { return nil }
        var req = URLRequest(url: u)
        req.timeoutInterval = 10
        var result: Data?
        let sem = DispatchSemaphore(value: 0)
        URLSession.shared.dataTask(with: req) { data, response, _ in
            if let http = response as? HTTPURLResponse, http.statusCode == 200 {
                result = data
            }
            sem.signal()
        }.resume()
        sem.wait()
        return result
    }
}
