import '../App.css'

import { useExamplePalette } from '../examplePalette.js'

export default function About() {
  const p = useExamplePalette()
  return (
    <view style={{ padding: 24, flex: 1, backgroundColor: p.surface }}>
      <text className="Description" style={{ marginBottom: 16, color: p.onSurface }}>
        Tamer4Lynx is a Lynx ecosystem of native extensions and tooling. Tamer packages (tamer-router, tamer-screen, tamer-icons, etc.) add routing, UI, and platform APIs on top of Lynx.
      </text>
      <text className="Description" style={{ marginBottom: 8, color: p.onSurface }}>This example demonstrates:</text>
      <text className="Hint" style={{ marginBottom: 4, color: p.onSurfaceVariant }}>• File-based routing (tamer-router)</text>
      <text className="Hint" style={{ marginBottom: 4, color: p.onSurfaceVariant }}>• Stack + Tabs layouts with AppBar/TabBar</text>
      <text className="Hint" style={{ marginBottom: 4, color: p.onSurfaceVariant }}>• tamer-screen, tamer-insets, tamer-icons</text>
      <text className="Hint" style={{ marginBottom: 4, color: p.onSurfaceVariant }}>• tamer-local-storage, tamer-secure-store, tamer-dev-client</text>
      <text className="Hint" style={{ marginBottom: 16, color: p.onSurfaceVariant }}>• tamer-system-ui (status/nav bar)</text>
      <text className="Description" style={{ marginBottom: 8, color: p.onSurface }}>Tech: React 17, TanStack Router, Lynx, Rspeedy.</text>
    </view>
  )
}
