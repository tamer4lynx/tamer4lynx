import { useCallback, useEffect, useState } from '@lynx-js/react'
import { useTamerRouter } from 'tamer-router'
import { Icon } from 'tamer-icons'

import '../App.css'
import lynxLogo from '../assets/lynx-logo.png?inline'
import reactLynxLogo from '../assets/react-logo.png?inline'

export default function Home() {
  const [alterLogo, setAlterLogo] = useState(false)
  // const [messages, setMessages] = useState<Array<{ id: string; text: string }>>([])
  // const [ws, setWs] = useState<WebSocket | null>(null)
  const { push } = useTamerRouter()

  // useEffect(() => {
  //   'background only'
  //   console.log('Home mounted')
  //   const websocket = new WebSocket('ws://localhost:8008')
  //   websocket.onopen = () => websocket.send('Hello from Lynx!')
  //   websocket.onmessage = (event) => setMessages((prev) => [...prev, { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`, text: event.data }])
  //   websocket.onerror = (e: any) => console.error('WebSocket Error:', e?.message)
  //   websocket.onclose = () => {}
  //   setWs(websocket)
  //   return () => { websocket.close() }
  // }, [])

  const onTap = useCallback(() => {
    'background only'
    console.log('onTap')
    setAlterLogo((prev) => !prev)
    NativeModules.JiggleModule?.vibrate?.(50)
    console.log('tapped logo')
    // if (ws) ws.send('Hello from Lynx tap!')
  }, [push /*, ws*/])

  return (
      <view className="App">
        <view className="Banner">
          <view className="Logo" bindtap={onTap}>
            {alterLogo ? (
              <image src={reactLynxLogo} className="Logo--react" />
            ) : (
              <image src={lynxLogo} className="Logo--lynx" />
            )}
          </view>
          <text className="Title">React</text>
          <text className="Subtitle">on Lynx</text>
        </view>
        {/* <view className="Content" style={{ flexDirection: 'column' }}>
          <text className="Description">Server Messages:</text>
          {messages.map((msg) => (
            <text key={msg.id} className="Hint">{msg.text}</text>
          ))}
        </view> */}
        <view className="Content">
          <view className="Button" bindtap={() => push('/insets')}>
            <text className="ButtonText">Test Insets & Keyboard</text>
          </view>
          <view className="Button" bindtap={() => push('/screen')} style={{ marginTop: 12 }}>
            <text className="ButtonText">tamer-screen</text>
          </view>
          <view className="Button" bindtap={() => push('/secure')} style={{ marginTop: 12 }}>
            <text className="ButtonText">Secure Number</text>
          </view>
          <view className="Button" bindtap={() => push('/dev')} style={{ marginTop: 12 }}>
            <text className="ButtonText">Dev Tools</text>
          </view>
          <view className="Button" style={{ display: 'flex', backgroundColor: 'red', flexDirection: 'row', gap: 16, marginTop: 16, justifyContent: 'center', alignItems: 'center' }}>
            <Icon name="search" set="material" size={24} color="#ffffff" />
            <Icon name="home" set="material" size={24} color="#fff" />
            <Icon name="heart" set="fontawesome" size={24} color="#000" />
          </view>
        </view>
      </view>
  )
}
