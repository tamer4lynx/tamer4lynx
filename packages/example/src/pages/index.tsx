import { useCallback, useEffect, useState } from '@lynx-js/react'
import { useTamerRouter } from '@tamer4lynx/tamer-router'
import { Icon } from '@tamer4lynx/tamer-icons'

import '../App.css'
import lynxLogo from '../assets/lynx-logo.png'
import reactLynxLogo from '../assets/react-logo.png'
import tamerLogo from '../assets/tamer-logo.png'

export default function Home() {
  const [alterLogo, setAlterLogo] = useState(0)
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
    setAlterLogo(prev => prev + 1)
    NativeModules.JiggleModule?.vibrate?.(50)
    console.log('tapped logo')
    // if (ws) ws.send('Hello from Lynx tap!')
  }, [push /*, ws*/])

  return (
      <view className="App">
        <view className="Background" />
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
          <text className="Title">React</text>
          <text className="Subtitle">on Tamer</text>
          <text className="Subtitle">on Lynx</text>
        </view>
        {/* <view className="Content" style={{ flexDirection: 'column' }}>
          <text className="Description">Server Messages:</text>
          {messages.map((msg) => (
            <text key={msg.id} className="Hint">{msg.text}</text>
          ))}
        </view> */}
        <view className="Content">
          <view className="Button" style={{ flex: "100%" }} bindtap={() => push('/insets')}>
            <text className="ButtonText">Test Insets & Keyboard</text>
          </view>
          <view className="Button" style={{ flex: "45%", maxWidth: "50%" }} bindtap={() => push('/screen')}>
            <text className="ButtonText">tamer-screen</text>
          </view>
          <view className="Button" style={{ flex: "45%",  maxWidth: "50%" }} bindtap={() => push('/secure')}>
            <text className="ButtonText">Secure Number</text>
          </view>
          <view className="Button" style={{ flex: "45%", maxWidth: "50%" }} bindtap={() => push('/native')}>
            <text className="ButtonText">Native Tests</text>
          </view>
          <view className="Button" style={{ flex: "45%", maxWidth: "50%" }} bindtap={() => push('/native/storage')}>
            <text className="ButtonText">Storage</text>
          </view>
          <view className="Button" style={{ flex: "45%", display: 'flex', backgroundColor: '#dd7777', flexDirection: 'row', gap: 16, justifyContent: 'center', alignItems: 'center' }}>
            <Icon name="search" set="material" size={20} color="#ffffff" />
            <Icon name="home" set="material" size={20} color="#fff" />
            <Icon name="heart" set="fontawesome" size={20} color="#000" />
          </view>
        </view>
      </view>
  )
}
