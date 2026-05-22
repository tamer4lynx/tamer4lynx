package = JSON.parse(File.read(File.join(__dir__, "..", "..", "package.json")))
lynx_sdk = package["lynxSdk"]
if lynx_sdk.nil? || lynx_sdk.empty?
  abort("[tamerasset] package.json must set \"lynxSdk\" to the Lynx SDK version (e.g. 3.6.0).")
end

Pod::Spec.new do |s|
  s.name             = 'tamerasset'
  s.version          = package["version"]
  s.summary          = 'Tamer asset loading native module for iOS.'
  s.description      = 'ETag-cached asset fetching, image dimension probing, and local FS cache for Tamer/Lynx apps.'
  s.homepage         = 'https://github.com/tamer4lynx/tamer4lynx'
  s.license          = package["license"]
  s.authors          = package["author"]
  s.source           = { :path => '.' }
  s.swift_version    = '5.0'
  s.ios.deployment_target = '13.0'
  s.source_files     = 'tamerasset/Classes/**/*.{swift,m}'
  s.dependency 'Lynx', "~> #{lynx_sdk}"
end
