package = JSON.parse(File.read(File.join(__dir__, "..", "..", "package.json")))

Pod::Spec.new do |s|
  s.name             = 'tamerstack'
  s.version          = package["version"]
  s.module_name      = 'tamerstack'
  s.summary          = 'Native stack navigation element for Lynx on iOS.'
  s.description      = 'Implements the <stack-screen> custom element enabling zero-bitmap native push/pop transitions.'
  s.homepage         = 'https://github.com/tamer4lynx/tamer-stack'
  s.license          = package["license"]
  s.authors          = package["author"]
  s.source           = { :path => '.' }
  s.ios.deployment_target = '13.0'
  s.source_files     = 'tamerstack/Classes/**/*.{h,m}'
  s.public_header_files = 'tamerstack/Classes/**/*.h'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
  s.dependency 'Lynx'
  s.requires_arc     = true
end
