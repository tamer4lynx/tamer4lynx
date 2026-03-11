import { useCallback, useEffect, useState } from '@lynx-js/react'
import { useTamerRouter } from 'tamer-router'

import '../App.css'
import lynxLogo from '../assets/lynx-logo.png?inline'
import reactLynxLogo from '../assets/react-logo.png?inline'

export default function Home() {
  const [alterLogo, setAlterLogo] = useState(false)
  const [messages, setMessages] = useState<Array<{ id: string; text: string }>>([])
  const [ws, setWs] = useState<WebSocket | null>(null)
  const { push } = useTamerRouter()

  useEffect(() => {
    'background only'
    const websocket = new WebSocket('ws://localhost:8008')
    websocket.onopen = () => websocket.send('Hello from Lynx!')
    websocket.onmessage = (event) => setMessages((prev) => [...prev, { id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`, text: event.data }])
    websocket.onerror = (e: any) => console.error('WebSocket Error:', e?.message)
    websocket.onclose = () => {}
    setWs(websocket)
    return () => { websocket.close() }
  }, [])

  const onTap = useCallback(() => {
    'background only'
    setAlterLogo((prev) => !prev)
    NativeModules.JiggleModule?.vibrate?.(50)
    push('/about')
    if (ws) ws.send('Hello from Lynx tap!')
  }, [push, ws])

  return (
    <view>
      <view className="Background" />
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
        <view className="Content">
          <text className="Description">Server Messages:</text>
          {messages.map((msg) => (
            <text key={msg.id} className="Hint">{msg.text}</text>
          ))}
          <view className="Button" bindtap={() => push('/insets')}>
            <text className="ButtonText">Test Insets & Keyboard</text>
          </view>
          <view className="Button" bindtap={() => push('/screen')} style={{ marginTop: 12 }}>
            <text className="ButtonText">tamer-screen</text>
          </view>
        </view>
        <view style={{ flex: 1 }} />
      </view>
    </view>
  )
}
