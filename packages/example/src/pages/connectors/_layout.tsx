import { Stack } from '@tamer4lynx/tamer-router'

export default function ConnectorsLayout() {
  return (
    <Stack pathPrefix="/connectors">
      <Stack.Screen name="index" options={{ title: 'Connectors' }} />
      <Stack.Screen name="zustand" options={{ title: 'Zustand' }} />
      <Stack.Screen name="zustand-detail" options={{ title: 'Zustand · detail' }} />
      <Stack.Screen name="redux" options={{ title: 'Redux' }} />
      <Stack.Screen name="redux-detail" options={{ title: 'Redux · detail' }} />
      <Stack.Screen name="tanstack-query" options={{ title: 'TanStack Query' }} />
      <Stack.Screen name="tanstack-query-detail" options={{ title: 'TanStack · detail' }} />
      <Stack.Screen name="apollo" options={{ title: 'Apollo' }} />
      <Stack.Screen name="apollo-detail" options={{ title: 'Apollo · detail' }} />
      <Stack.Screen name="swr" options={{ title: 'SWR' }} />
      <Stack.Screen name="swr-detail" options={{ title: 'SWR · detail' }} />
      <Stack.Screen name="jotai" options={{ title: 'Jotai' }} />
      <Stack.Screen name="jotai-detail" options={{ title: 'Jotai · detail' }} />
      <Stack.Screen name="i18next" options={{ title: 'i18next' }} />
      <Stack.Screen name="i18next-detail" options={{ title: 'i18next · detail' }} />
      <Stack.Screen name="theme" options={{ title: 'Theme' }} />
      <Stack.Screen name="theme-detail" options={{ title: 'Theme · detail' }} />
      <Stack.Screen name="recoil" options={{ title: 'Recoil' }} />
      <Stack.Screen name="recoil-detail" options={{ title: 'Recoil · detail' }} />
    </Stack>
  )
}
