import '../App.css'

export default function About() {
  return (
    <view style={{ padding: 24, flex: 1 }}>
      <text className="Description" style={{ marginBottom: 16 }}>
        Tamer4Lynx is a Lynx ecosystem of native extensions and tooling. Tamer packages (tamer-router, tamer-screen, tamer-icons, etc.) add routing, UI, and platform APIs on top of Lynx.
      </text>
      <text className="Description" style={{ marginBottom: 8 }}>This example demonstrates:</text>
      <text className="Hint" style={{ marginBottom: 4 }}>• File-based routing (tamer-router)</text>
      <text className="Hint" style={{ marginBottom: 4 }}>• Stack + Tabs layouts with AppBar/TabBar</text>
      <text className="Hint" style={{ marginBottom: 4 }}>• tamer-screen, tamer-insets, tamer-icons</text>
      <text className="Hint" style={{ marginBottom: 4 }}>• tamer-local-storage, tamer-secure-store, tamer-dev-client</text>
      <text className="Hint" style={{ marginBottom: 16 }}>• tamer-system-ui (status/nav bar)</text>
      <text className="Description" style={{ marginBottom: 8 }}>Tech: React 17, react-router 6, Lynx, Rspeedy.</text>
    </view>
  )
}
