import { useEffect, useState } from '@lynx-js/react'
import {
  createApolloSync,
  createI18nextSync,
  createJotaiSync,
  createRecoilSync,
  createReduxSync,
  createSwrSync,
  createTamerProviderConnector,
  createTanstackQuerySync,
  createThemeSync,
  createTrackedSwrCache,
  createZustandSync,
  type TamerStateSync,
} from '@tamer4lynx/tamer-router'

// ---------- Zustand ----------
import { createStore as createZustandStore } from 'zustand/vanilla'

interface ZustandDemoState {
  count: number
  note: string
}

export const zustandDemoStore = createZustandStore<ZustandDemoState>(() => ({
  count: 0,
  note: 'hello',
}))

export function incZustand(): void {
  'background only'
  zustandDemoStore.setState((s) => ({ count: s.count + 1 }))
}

export function setZustandNote(note: string): void {
  'background only'
  zustandDemoStore.setState({ note })
}

export const zustandConnector = createZustandSync('demoZustand', zustandDemoStore)

// ---------- Redux ----------
import { configureStore, createSlice } from '@reduxjs/toolkit'

const reduxSlice = createSlice({
  name: 'demoRedux',
  initialState: { count: 0, label: 'redux-init' },
  reducers: {
    inc: (s) => {
      s.count += 1
    },
    setLabel: (s, a: { payload: string }) => {
      s.label = a.payload
    },
  },
})

export const { inc: reduxInc, setLabel: reduxSetLabel } = reduxSlice.actions

export const reduxStore = configureStore({ reducer: reduxSlice.reducer })

export type ReduxDemoState = ReturnType<typeof reduxStore.getState>

export function incRedux(): void {
  'background only'
  reduxStore.dispatch(reduxInc())
}

export const reduxConnector = createReduxSync<ReduxDemoState, ReturnType<typeof reduxInc>>(
  'demoRedux',
  reduxStore as never,
  reduxSlice.reducer as never,
)

// ---------- TanStack Query ----------
import { dehydrate, hydrate, QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: Infinity, gcTime: Infinity } },
})

export const TANSTACK_DEMO_KEY = ['demo', 'value'] as const

export function incTanstack(): void {
  'background only'
  queryClient.setQueryData(TANSTACK_DEMO_KEY, (prev: { count: number; source: string } | undefined) => ({
    count: (prev?.count ?? 0) + 1,
    source: 'inc',
  }))
}

export const tanstackConnector = createTanstackQuerySync('demoTanstack', queryClient, {
  dehydrate,
  hydrate,
})

// ---------- Apollo ----------
import { ApolloClient, ApolloLink, gql, InMemoryCache } from '@apollo/client'

const APOLLO_DEMO_QUERY = gql`
  query DemoApollo {
    demo @client {
      count
      note
    }
  }
`

export const apolloClient = new ApolloClient({
  link: ApolloLink.empty(),
  cache: new InMemoryCache(),
})

apolloClient.writeQuery({
  query: APOLLO_DEMO_QUERY,
  data: { demo: { __typename: 'Demo', count: 0, note: 'apollo-init' } },
})

export function readApolloDemo(): { count: number; note: string } {
  const data = apolloClient.readQuery<{ demo: { count: number; note: string } }>({
    query: APOLLO_DEMO_QUERY,
  })
  return data?.demo ?? { count: 0, note: 'apollo-init' }
}

export function incApollo(): void {
  'background only'
  const cur = readApolloDemo()
  apolloClient.writeQuery({
    query: APOLLO_DEMO_QUERY,
    data: { demo: { __typename: 'Demo', count: cur.count + 1, note: 'apollo-inc' } },
  })
}

export const apolloConnector = createApolloSync('demoApollo', apolloClient)

// ---------- SWR ----------
export const swrCache = createTrackedSwrCache([
  ['demo:counter', { count: 0, label: 'swr-init' }],
])

export function incSwr(): void {
  'background only'
  const cur = (swrCache.get('demo:counter') as { count: number; label: string } | undefined) ?? {
    count: 0,
    label: 'swr-init',
  }
  swrCache.set('demo:counter', { count: cur.count + 1, label: 'swr-inc' })
}

export const swrConnector = createSwrSync('demoSwr', swrCache)

// ---------- Jotai ----------
import { atom, createStore as createJotaiStore } from 'jotai'

export const jotaiCountAtom = atom(0)
export const jotaiLabelAtom = atom('jotai-init')

export const jotaiStore = createJotaiStore()

export function incJotai(): void {
  'background only'
  jotaiStore.set(jotaiCountAtom, jotaiStore.get(jotaiCountAtom) + 1)
  jotaiStore.set(jotaiLabelAtom, 'jotai-inc')
}

export const jotaiConnector = createJotaiSync('demoJotai', jotaiStore as never, {
  count: jotaiCountAtom as never,
  label: jotaiLabelAtom as never,
})

// ---------- i18next ----------
import i18n from 'i18next'

void i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  compatibilityJSON: 'v3',
  initImmediate: false,
  interpolation: { escapeValue: false },
  resources: {
    en: { translation: { greeting: 'Hello, world', subtitle: 'English copy' } },
    es: { translation: { greeting: 'Hola, mundo', subtitle: 'Texto en español' } },
    fr: { translation: { greeting: 'Bonjour le monde', subtitle: 'Texte français' } },
  },
})

export function setI18nLanguage(lng: string): void {
  'background only'
  void i18n.changeLanguage(lng)
}

export const i18nextConnector = createI18nextSync('demoI18n', i18n)

// ---------- Theme ----------
type DemoTheme = 'light' | 'dark' | 'system'

let themeValue: DemoTheme = 'light'
const themeListeners = new Set<() => void>()

export function getDemoTheme(): DemoTheme {
  return themeValue
}

export function setDemoTheme(next: DemoTheme): void {
  if (next === themeValue) return
  themeValue = next
  for (const l of themeListeners) l()
}

export const themeConnector = createThemeSync<DemoTheme>('demoTheme', {
  getTheme: () => themeValue,
  setTheme: (t) => setDemoTheme(t),
  subscribe: (listener) => {
    themeListeners.add(listener)
    return () => {
      themeListeners.delete(listener)
    }
  },
})

// ---------- Helpers (tiny generic React hooks) ----------

export function useStoreSnapshot<T>(getState: () => T, subscribe: (l: () => void) => () => void): T {
  const [snap, setSnap] = useState<T>(getState)
  useEffect(() => {
    setSnap(getState())
    return subscribe(() => setSnap(getState()))
  }, [getState, subscribe])
  return snap
}

// Convenience signature for the smart-caveman: stable reads matching connector signatures.
export function useZustandDemo(): ZustandDemoState {
  return useStoreSnapshot(
    () => zustandDemoStore.getState(),
    (l) => zustandDemoStore.subscribe(l),
  )
}

export function useReduxDemo(): ReduxDemoState {
  return useStoreSnapshot(
    () => reduxStore.getState(),
    (l) => reduxStore.subscribe(l),
  )
}

export function useTanstackDemo(): { count: number; source: string } {
  return useStoreSnapshot(
    () => (queryClient.getQueryData(TANSTACK_DEMO_KEY) as { count: number; source: string }) ?? { count: 0, source: 'init' },
    (l) => queryClient.getQueryCache().subscribe(() => l()),
  )
}

export function useApolloDemo(): { count: number; note: string } {
  return useStoreSnapshot(readApolloDemo, (listener) => {
    const watched = apolloClient.cache.watch({
      query: APOLLO_DEMO_QUERY,
      optimistic: false,
      callback: () => listener(),
    })
    return typeof watched === 'function' ? watched : () => {}
  })
}

export function useSwrDemo(): { count: number; label: string } {
  return useStoreSnapshot(
    () => (swrCache.get('demo:counter') as { count: number; label: string }) ?? { count: 0, label: 'swr-init' },
    (l) => swrCache.subscribe(l),
  )
}

export function useJotaiDemo(): { count: number; label: string } {
  return useStoreSnapshot(
    () => ({ count: jotaiStore.get(jotaiCountAtom), label: jotaiStore.get(jotaiLabelAtom) }),
    (l) => {
      const u1 = jotaiStore.sub(jotaiCountAtom, l)
      const u2 = jotaiStore.sub(jotaiLabelAtom, l)
      return () => {
        u1()
        u2()
      }
    },
  )
}

export function useI18nDemo(): { language: string; greeting: string; subtitle: string } {
  return useStoreSnapshot(
    () => ({ language: i18n.language, greeting: i18n.t('greeting'), subtitle: i18n.t('subtitle') }),
    (l) => {
      const handler = () => l()
      i18n.on('languageChanged', handler)
      return () => i18n.off('languageChanged', handler)
    },
  )
}

export function useThemeDemo(): DemoTheme {
  return useStoreSnapshot(
    () => themeValue,
    (l) => {
      themeListeners.add(l)
      return () => {
        themeListeners.delete(l)
      }
    },
  )
}

// ---------- Recoil ----------
// Lynx React does not support Recoil's React hooks (no RecoilRoot/useRecoilState here);
// the connector still demonstrates the atom-effect bridge and exposes
// getValue/subscribe/set so UI works without Recoil hooks.
import { atom as recoilAtom, RecoilEnv } from 'recoil'

RecoilEnv.RECOIL_GKS_ENABLED.delete('recoil_sync_external_store')

interface RecoilDemoState {
  count: number
  label: string
}

const RECOIL_DEMO_DEFAULT: RecoilDemoState = { count: 0, label: 'recoil-init' }

export const recoilSyncBundle = createRecoilSync<RecoilDemoState>(
  'demoRecoil',
  RECOIL_DEMO_DEFAULT,
)

// Atom kept registered so a real RecoilRoot host would receive the effect.
export const recoilDemoAtom = recoilAtom<RecoilDemoState>({
  key: 'tamer-demo-recoil-connector',
  default: RECOIL_DEMO_DEFAULT,
  effects: [recoilSyncBundle.effect as never],
})

export const recoilConnector = recoilSyncBundle.connector

export function setRecoilDemo(updater: (prev: RecoilDemoState) => RecoilDemoState): void {
  'background only'
  recoilSyncBundle.set(updater)
}

export function useRecoilDemo(): RecoilDemoState {
  return useStoreSnapshot(
    () => recoilSyncBundle.getValue(),
    (l) => recoilSyncBundle.subscribe(l),
  )
}

// Aggregate registry consumed by FileRouter providerConnector.
export const connectorsProviderRegistry: TamerStateSync[] = [
  zustandConnector,
  reduxConnector,
  tanstackConnector,
  apolloConnector,
  swrConnector,
  jotaiConnector,
  i18nextConnector,
  themeConnector,
  recoilConnector,
]

// Re-export for type usage.
export { createTamerProviderConnector }
