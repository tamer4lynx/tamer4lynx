import { Outlet } from 'react-router'

export default function Layout() {
  return (
    <view style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <Outlet  />
    </view>
  )
}
