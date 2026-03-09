import fs from 'fs';
import path from 'path';
import alink from "../android/autolink";
import ilink from "../ios/autolink";
import { resolveHostPaths } from './hostConfig';

(() => {
    const configPath = path.join(process.cwd(), 'tamer.config.json');
    let config: any = {};
    if (fs.existsSync(configPath)) {
        config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } else {
        console.warn('⚠️ tamer.config.json not found. Skipping autolinking.');
        return;
    }

    if (config.autolink) {
        try {
            const { androidDir, iosDir } = resolveHostPaths();
            if (fs.existsSync(androidDir)) alink();
            if (process.platform === 'darwin' && fs.existsSync(iosDir)) ilink();
        } catch {
            const androidRoot = path.join(process.cwd(), 'android');
            if (fs.existsSync(androidRoot)) alink();
            if (process.platform === 'darwin') {
                const iosRoot = path.join(process.cwd(), 'ios');
                if (fs.existsSync(iosRoot)) ilink();
            }
        }
        console.log('Autolinking complete.');
    } else {
        console.log('Autolinking not enabled in tamer.config.json.');
    }
})();