import Foundation

class LynxProvider: NSObject, LynxTemplateProvider {
    func loadTemplate(withUrl url: String!, onComplete callback: LynxTemplateLoadBlock!) {
        DispatchQueue.global(qos: .background).async {
            guard let url = url,
                  let bundleUrl = Bundle.main.url(forResource: url, withExtension: nil),
                  let data = try? Data(contentsOf: bundleUrl) else {
                let err = NSError(domain: "LynxProvider", code: 404,
                                  userInfo: [NSLocalizedDescriptionKey: "Bundle not found: \(url ?? "nil")"])
                callback?(nil, err)
                return
            }
            callback?(data, nil)
        }
    }
}
	