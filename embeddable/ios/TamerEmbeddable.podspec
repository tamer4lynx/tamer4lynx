Pod::Spec.new do |s|
  s.name = 'TamerEmbeddable'
  s.version = '1.0.0'
  s.summary = 'Embeddable Lynx bundle with native modules'
  s.homepage = 'https://github.com/tamer4lynx/tamer4lynx'
  s.license = 'Apache-2.0'
  s.author = 'Tamer4Lynx'
  s.source = { :path => '.' }
  s.ios.deployment_target = '13.0'
  s.swift_version = '5.0'
  s.source_files = 'TamerEmbeddable/**/*.swift'
  s.resources = 'TamerEmbeddable/Resources/**/*'
  s.dependency 'Lynx', '3.6.0', :subspecs => ['Framework']
  s.dependency 'PrimJS', '3.6.1', :subspecs => ['quickjs', 'napi']
  s.dependency 'LynxService', '3.6.0', :subspecs => ['Image', 'Log', 'Http']
  s.dependency 'SDWebImage', '5.15.5'
  s.dependency 'SDWebImageWebPCoder', '0.11.0'
  s.dependency 'jiggle'
  s.dependency 'tamerbiometric'
  s.dependency 'tamerdevclient'
  s.dependency 'tamerdisplaybrowser'
  s.dependency 'tamericons'
  s.dependency 'tamerinsets'
  s.dependency 'tamerlinking'
  s.dependency 'tamerrouter'
  s.dependency 'tamersecurestore'
  s.dependency 'tamersystemui'
  s.dependency 'tamertextinput'
  s.dependency 'tamertransports'
  s.dependency 'tamerwebview'
end
