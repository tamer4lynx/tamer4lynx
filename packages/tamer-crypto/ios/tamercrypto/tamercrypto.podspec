package = JSON.parse(File.read(File.join(__dir__, "..", "..", "package.json")))

Pod::Spec.new do |s|
  s.name             = 'tamercrypto'
  s.version          = package["version"]
  s.summary          = 'Native Web Crypto–shaped operations for Lynx.'
  s.description      = package["description"]
  s.homepage         = "https://github.com/tamer4lynx/tamer4lynx"
  s.license          = package["license"]
  s.authors          = { "tamer4lynx" => "https://github.com/tamer4lynx" }
  s.source           = { :path => '.' }
  s.ios.deployment_target = '14.0'
  s.swift_version    = '5.0'
  s.source_files     = 'tamercrypto/Classes/**/*.swift'
  s.frameworks       = 'Security'
  s.dependency "Lynx"
end
