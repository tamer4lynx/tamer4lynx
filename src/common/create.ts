import fs from 'fs';
import path from 'path';
import readline from 'readline';

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });

function ask(question: string): Promise<string> {
  return new Promise(resolve => rl.question(question, answer => resolve(answer.trim())));
}

async function create() {
  console.log('Tamer4Lynx: Create Lynx Extension\n');
  console.log('Select extension types (space to toggle, enter to confirm):');
  console.log('  [ ] Native Module');
  console.log('  [ ] Element');
  console.log('  [ ] Service\n');

  const includeModule = /^y(es)?$/i.test(await ask('Include Native Module? (Y/n): ') || 'y');
  const includeElement = /^y(es)?$/i.test(await ask('Include Element? (y/N): ') || 'n');
  const includeService = /^y(es)?$/i.test(await ask('Include Service? (y/N): ') || 'n');

  if (!includeModule && !includeElement && !includeService) {
    console.error('❌ At least one extension type is required.');
    rl.close();
    process.exit(1);
  }

  const extName = await ask('Extension package name (e.g. my-lynx-module): ');
  if (!extName || !/^[a-z0-9-_]+$/.test(extName)) {
    console.error('❌ Invalid package name. Use lowercase letters, numbers, hyphens, underscores.');
    rl.close();
    process.exit(1);
  }

  const packageName = await ask('Android package name (e.g. com.example.mymodule): ') || `com.example.${extName.replace(/-/g, '')}`;
  const simpleModuleName = extName.split('-').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join('') + 'Module';
  const fullModuleClassName = `${packageName}.${simpleModuleName}`;

  const cwd = process.cwd();
  const root = path.join(cwd, extName);

  if (fs.existsSync(root)) {
    console.error(`❌ Directory ${extName} already exists.`);
    rl.close();
    process.exit(1);
  }

  fs.mkdirSync(root, { recursive: true });

  const lynxExt = {
    platforms: {
      android: {
        packageName,
        moduleClassName: fullModuleClassName,
        sourceDir: 'android',
      },
      ios: {
        podspecPath: `ios/${extName}`,
        moduleClassName: simpleModuleName,
      },
      web: {},
    },
  };

  fs.writeFileSync(path.join(root, 'lynx.ext.json'), JSON.stringify(lynxExt, null, 2));

  const pkg: Record<string, unknown> = {
    name: extName,
    version: '0.0.1',
    type: 'module',
    main: 'index.js',
    description: `Lynx extension: ${extName}`,
    scripts: { codegen: 't4l codegen' },
    devDependencies: { typescript: '^5' },
    peerDependencies: { typescript: '^5' },
    engines: { node: '>=18' },
  };
  if (includeModule) pkg.types = 'src/index.d.ts';
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify(pkg, null, 2));

  const pkgPath = packageName.replace(/\./g, '/');

  if (includeModule) {
    fs.mkdirSync(path.join(root, 'src'), { recursive: true });
    fs.writeFileSync(path.join(root, 'src', 'index.d.ts'), `/** @lynxmodule */
export declare class ${simpleModuleName} {
  // Add your module methods here
}
`);

    fs.mkdirSync(path.join(root, 'android', 'src', 'main', 'kotlin', pkgPath), { recursive: true });
    fs.writeFileSync(path.join(root, 'android', 'build.gradle.kts'), `plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "${packageName}"
    compileSdk = 35
    defaultConfig { minSdk = 28 }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
}

dependencies {
    implementation(libs.lynx)
    implementation(libs.lynx.jssdk)
}
`);

    fs.writeFileSync(path.join(root, 'android', 'src', 'main', 'AndroidManifest.xml'), `<?xml version="1.0" encoding="utf-8"?>
<manifest />
`);

    const ktContent = `package ${packageName}

import android.content.Context
import com.lynx.jsbridge.LynxMethod
import com.lynx.jsbridge.LynxModule

class ${simpleModuleName}(context: Context) : LynxModule(context) {

    @LynxMethod
    fun example(): String {
        return "Hello from ${extName}"
    }
}
`;
    fs.writeFileSync(path.join(root, 'android', 'src', 'main', 'kotlin', pkgPath, `${simpleModuleName}.kt`), ktContent);

    fs.mkdirSync(path.join(root, 'ios', extName, extName, 'Classes'), { recursive: true });
    const podspec = `Pod::Spec.new do |s|
  s.name             = '${extName}'
  s.version          = '0.0.1'
  s.summary          = 'Lynx extension: ${extName}'
  s.homepage         = ''
  s.license          = { :type => 'MIT' }
  s.author           = ''
  s.source           = { :git => '' }
  s.platform         = :ios, '12.0'
  s.source_files     = 'Classes/**/*'
  s.dependency       'Lynx'
end
`;
    fs.writeFileSync(path.join(root, 'ios', extName, `${extName}.podspec`), podspec);

    const swiftContent = `import Foundation

@objc public class ${simpleModuleName}: NSObject {
    @objc public func example() -> String {
        return "Hello from ${extName}"
    }
}
`;
    fs.writeFileSync(path.join(root, 'ios', extName, extName, 'Classes', `${simpleModuleName}.swift`), swiftContent);
  }

  fs.writeFileSync(path.join(root, 'index.js'), `'use strict';
module.exports = {};
`);

  fs.writeFileSync(path.join(root, 'tsconfig.json'), JSON.stringify({
    compilerOptions: { target: 'ES2020', module: 'ESNext', moduleResolution: 'bundler', strict: true },
    include: ['src'],
  }, null, 2));

  fs.writeFileSync(path.join(root, 'README.md'), `# ${extName}

Lynx extension for ${extName}.

## Usage

\`\`\`bash
npm install ${extName}
\`\`\`

## Configuration

This package uses \`lynx.ext.json\` (RFC-compliant) for autolinking.
`);

  console.log(`\n✅ Created extension at ${root}`);
  console.log('\nNext steps:');
  console.log(`  cd ${extName}`);
  console.log('  npm install');
  if (includeModule) console.log('  npm run codegen');
  rl.close();
}

export default create;
