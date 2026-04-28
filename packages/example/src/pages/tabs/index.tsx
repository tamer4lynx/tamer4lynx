import { useCallback, useState } from '@lynx-js/react';
import { useTamerRouter } from '@tamer4lynx/tamer-router';
import '@tamer4lynx/tamer-icons';

import { Button, px } from '@tamer4lynx/tamer-app-shell';
import '../../App.css';
import lynxLogo from '../../assets/lynx-logo.png?inline';
import reactLynxLogo from '../../assets/react-logo.png?inline';
import tamerLogo from '../../assets/tamer-logo.png?inline';
import { pageShellStyle, useExamplePalette } from '../../examplePalette.js';

export default function Home() {
  const p = useExamplePalette();
  const [alterLogo, setAlterLogo] = useState(0);
  const { push } = useTamerRouter();

  const onTap = useCallback(() => {
    'background only';
    console.log('onTap');
    setAlterLogo((prev) => prev + 1);
    NativeModules.JiggleModule?.vibrate?.(50);
    console.log('tapped logo');
  }, [push]);

  return (
    <view>
      <view className="Banner">
        <view className="Logo" bindtap={onTap}>
          {alterLogo % 2 === 0 ? (
            <image src={reactLynxLogo} className="Logo--react" />
          ) : alterLogo % 3 === 0 ? (
            <image src={lynxLogo} className="Logo--lynx" />
          ) : (
            <image src={tamerLogo} className="Logo--tamer" />
          )}
        </view>
        <text className="Title" style={{ color: p.onSurface }}>
          React
        </text>
        <text className="Subtitle" style={{ color: p.onSurface }}>
          on Tamer
        </text>
        <text className="Subtitle" style={{ color: p.onSurface }}>
          on Lynx
        </text>
      </view>
      <view className="Content">
        <Button
          label="M3 Components (app shell)"
          onTap={() => push('/m3')}
          variant="filled"
          size="sm"
          style={{ flex: '100%', width: '100%' }}
        />
        <Button
          label="Test Insets & Keyboard"
          onTap={() => push('/tabs/insets')}
          variant="filled"
          size="sm"
          style={{ flex: '100%', width: '100%' }}
        />
        <Button
          label="tamer-screen"
          onTap={() => push('/tabs/screen')}
          variant="filled"
          size="sm"
          style={{ flex: '45%', maxWidth: '50%' }}
        />
        <Button
          label="Secure Number"
          onTap={() => push('/tabs/secure')}
          variant="filled"
          size="sm"
          style={{ flex: '45%', maxWidth: '50%' }}
        />
        <Button
          label="Native Tests"
          onTap={() => push('/native')}
          variant="filled"
          size="sm"
          style={{ flex: '45%', maxWidth: '50%' }}
        />
        <Button
          label="Storage"
          onTap={() => push('/native/storage')}
          variant="filled"
          size="sm"
          style={{ flex: '45%', maxWidth: '50%' }}
        />
        <view
          className="Button"
          style={{
            flex: '45%',
            display: 'flex',
            backgroundColor: '#dd7777',
            flexDirection: 'row',
            gap: px(16),
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <icon
            icon="search"
            set="material"
            size={20}
            iconColor="#ffffff"
            style={{ width: '20px', height: '20px' }}
          />
          <icon
            icon="home"
            set="material"
            size={20}
            iconColor="#fff"
            style={{ width: '20px', height: '20px' }}
          />
          <icon
            icon="heart"
            set="fontawesome"
            size={20}
            iconColor="#000"
            style={{ width: '20px', height: '20px' }}
          />
        </view>
      </view>
    </view>
  );
}
