import { useCallback, useRef, useEffect } from '@lynx-js/react'
import { useNavigate } from 'react-router'

export default function About() {
  const navigate = useNavigate()
  const navigateRef = useRef(navigate)
  useEffect(() => {
    navigateRef.current = navigate
  }, [navigate])
  const goHome = useCallback(() => {
    'background only'
    navigateRef.current?.('/')
  }, [])
  return (
    <view style={{ padding: 24, flex: 1 }}>
      <text style={{ marginBottom: 16 }}>Tamer4Lynx example with tamer-router.</text>
      <view bindtap={goHome} style={{ padding: 8 }}>
        <text>← Back to Home</text>
      </view>
    </view>
  )
}
