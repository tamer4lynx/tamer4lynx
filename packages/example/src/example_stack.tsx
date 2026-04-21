import '@lynx-js/react/debug'
import '@tamer4lynx/tamer-transports/lynx'

import {
  createContext,
  useContext,
  useEffect,
  useInitData,
  useLynxGlobalEventListener,
  useRef,
  useState,
} from '@lynx-js/react'
import type { ReactNode } from '@lynx-js/react'
import { AppBar } from '@tamer4lynx/tamer-app-shell'
import {
  TamerNav,
  readHydratedStateJson,
  subscribeHydratedStateJson,
} from '@tamer4lynx/tamer-navigation'
import { SafeArea, Screen, useInsets } from '@tamer4lynx/tamer-screen'
import { BackHandlerProvider, useBackHandler } from '@tamer4lynx/tamer-router'
import { M3PageContent } from './pages/m3/index.js'

type StackScreenId = 'a' | 'b' | 'c' | 'd' | 'e' | 'm3'
type StackEntry = { route: StackScreenId; screenId: string }
type ScreenInitData = { route?: StackScreenId; screenId?: string }
type DispatchPayload = { action?: string }
type PoppedPayload = { screenId?: string; result?: string }
type PushRouteAction = { type: 'push-route'; route: StackScreenId }
type SharedContextMutationPayload = {
  note?: string
  counterDelta?: number
  updatedBy?: string
}
type SharedContextDispatchAction = {
  type: 'shared-context-mutate'
  screenId?: string
  payloadJson: string
}
type NavDispatchAction = PushRouteAction | SharedContextDispatchAction
type SharedState = {
  note: string
  counter: number
  updatedBy: string
  version: number
}
type SharedStateStore = {
  getState: () => SharedState
  subscribe: (listener: () => void) => () => void
  hydrate: (nextState: SharedState) => void
  mutate: (payload: SharedContextMutationPayload) => SharedState
}
type SharedStateActions = {
  setNote: (note: string) => void
  bumpCounter: () => void
}
type SharedStateContextValue = {
  store: SharedStateStore
  actions: SharedStateActions
}

const NATIVE_BUNDLE_SRC = 'main.lynx.bundle'
const DEFAULT_SHARED_STATE: SharedState = {
  note: 'coordinator ready',
  counter: 0,
  updatedBy: 'root',
  version: 0,
}

const SharedStateContext = createContext<SharedStateContextValue | null>(null)

const SCREEN_META: Record<StackScreenId, { label: string; color: string }> = {
  a: { label: 'A', color: '#6200EE' },
  b: { label: 'B', color: '#018786' },
  c: { label: 'C', color: '#1565C0' },
  d: { label: 'D', color: '#6A1B9A' },
  e: { label: 'E', color: '#BF360C' },
  m3: { label: 'M3', color: '#5E35B1' },
}

const BUTTON_STYLE = {
  paddingLeft: '40rpx',
  paddingRight: '40rpx',
  paddingTop: '32rpx',
  paddingBottom: '32rpx',
  minHeight: '112rpx',
  borderRadius: '16rpx',
  marginBottom: '24rpx',
  display: 'flex' as const,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
}

function stringify(value: unknown): string {
  try {
    return JSON.stringify(value ?? {})
  } catch {
    return '{}'
  }
}

function parseJson<T>(value: string | undefined, fallback: T): T {
  if (!value) return fallback

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

const DEFAULT_SHARED_STATE_JSON = stringify(DEFAULT_SHARED_STATE)

function areSharedStatesEqual(left: SharedState, right: SharedState): boolean {
  return left.note === right.note
    && left.counter === right.counter
    && left.updatedBy === right.updatedBy
    && left.version === right.version
}

function isStackScreenId(value: unknown): value is StackScreenId {
  return value === 'a'
    || value === 'b'
    || value === 'c'
    || value === 'd'
    || value === 'e'
    || value === 'm3'
}

function parseDispatchAction(payload: DispatchPayload | undefined): NavDispatchAction | null {
  if (!payload?.action) return null

  try {
    const action = JSON.parse(payload.action) as Partial<NavDispatchAction>
    if (action.type === 'push-route' && isStackScreenId(action.route)) {
      return {
        type: 'push-route',
        route: action.route,
      }
    }
    if (action.type === 'shared-context-mutate' && typeof action.payloadJson === 'string') {
      return {
        type: 'shared-context-mutate',
        screenId: typeof action.screenId === 'string' ? action.screenId : undefined,
        payloadJson: action.payloadJson,
      }
    }
  } catch (error) {
    console.warn('[example_stack] failed to parse dispatch payload', error)
  }

  return null
}

function mergeSharedState(
  previous: SharedState,
  payload: SharedContextMutationPayload,
): SharedState {
  return {
    note: payload.note ?? previous.note,
    counter: previous.counter + (payload.counterDelta ?? 0),
    updatedBy: payload.updatedBy ?? previous.updatedBy,
    version: previous.version + 1,
  }
}

function coerceSharedState(value: Partial<SharedState> | null | undefined): SharedState {
  return {
    note: typeof value?.note === 'string' ? value.note : DEFAULT_SHARED_STATE.note,
    counter: typeof value?.counter === 'number' ? value.counter : DEFAULT_SHARED_STATE.counter,
    updatedBy:
      typeof value?.updatedBy === 'string'
        ? value.updatedBy
        : DEFAULT_SHARED_STATE.updatedBy,
    version: typeof value?.version === 'number' ? value.version : DEFAULT_SHARED_STATE.version,
  }
}

function buildSharedStateJson(sharedState: SharedState): string {
  return stringify(sharedState)
}

function parseSharedStateJson(stateJson: string | undefined): SharedState {
  const parsed = parseJson<Partial<SharedState>>(stateJson, DEFAULT_SHARED_STATE)
  return coerceSharedState(parsed)
}

function readHydratedSharedState(): SharedState {
  return parseSharedStateJson(readHydratedStateJson(DEFAULT_SHARED_STATE_JSON))
}

/**
 * Provider hydration contract examples:
 * - Redux: serialize the selected store slice or the full store state, then hydrate a local store.
 * - Zustand: serialize a store snapshot or slice, then apply it into a local store instance.
 * - TanStack Query: serialize the dehydrated query cache, not the live QueryClient instance.
 * - Recoil: serialize the chosen atom/selector snapshot, then restore it into a local store wrapper.
 */
function createHydratedStore(initialState: SharedState): SharedStateStore {
  let state = initialState
  const listeners = new Set<() => void>()

  const notify = () => {
    listeners.forEach((listener) => {
      listener()
    })
  }

  return {
    getState() {
      return state
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    hydrate(nextState) {
      if (areSharedStatesEqual(state, nextState)) return
      state = nextState
      notify()
    },
    mutate(payload) {
      const nextState = mergeSharedState(state, payload)
      if (areSharedStatesEqual(state, nextState)) return state
      state = nextState
      notify()
      return state
    },
  }
}

const FALLBACK_SHARED_STATE_STORE = createHydratedStore(DEFAULT_SHARED_STATE)

function applyHydratedSnapshot(store: SharedStateStore, nextState: SharedState) {
  store.hydrate(nextState)
}

function useHydratedStoreState(store: SharedStateStore): SharedState {
  const [sharedState, setSharedState] = useState<SharedState>(() => store.getState())

  useEffect(() => {
    setSharedState(store.getState())
    return store.subscribe(() => {
      setSharedState(store.getState())
    })
  }, [store])

  return sharedState
}

function SharedStateProvider({
  store,
  actions,
  children,
}: SharedStateContextValue & { children: ReactNode }) {
  return (
    <SharedStateContext.Provider value={{ store, actions }}>
      {children}
    </SharedStateContext.Provider>
  )
}

function useSharedStateContext(): SharedStateActions & { sharedState: SharedState } {
  const context = useContext(SharedStateContext)
  const store = context?.store ?? FALLBACK_SHARED_STATE_STORE
  const sharedState = useHydratedStoreState(store)

  return {
    sharedState,
    setNote: context?.actions.setNote ?? (() => {}),
    bumpCounter: context?.actions.bumpCounter ?? (() => {}),
  }
}

function InsetsDebug() {
  const insets = useInsets()
  useEffect(() => {
    console.log('[InsetsDebug]', JSON.stringify(insets))
  }, [insets])
  return (
    <text style={{ color: '#ff0', fontSize: '22rpx', marginBottom: '16rpx' }}>
      insets: t={insets.top} r={insets.right} b={insets.bottom} l={insets.left}
    </text>
  )
}

function SampleInputFields({
  fieldBg,
  borderColor,
  labelColor,
  textColor,
}: {
  fieldBg: string
  borderColor: string
  labelColor: string
  textColor: string
}) {
  const [line, setLine] = useState('')
  const [area, setArea] = useState('')
  const fieldBorder = `1px solid ${borderColor}`

  return (
    <view style={{ marginBottom: '24rpx' }}>
      <text
        style={{
          color: labelColor,
          fontSize: '26rpx',
          marginBottom: '8rpx',
        }}
      >
        Input
      </text>
      <input
        value={line}
        placeholder="Single-line..."
        enable-scroll-bar
        bindinput={(e) => {
          'background only'
          setLine(e.detail.value)
        }}
        style={{
          backgroundColor: fieldBg,
          color: textColor,
          borderRadius: '12px',
          border: fieldBorder,
          height: '48px',
          padding: '8px',
          marginBottom: '16rpx',
          width: '100%',
        }}
      />
      <text
        style={{
          color: labelColor,
          fontSize: '26rpx',
          marginBottom: '8rpx',
        }}
      >
        Textarea
      </text>
      <textarea
        value={area}
        placeholder="Multiple lines..."
        enable-scroll-bar
        bindinput={(e) => {
          'background only'
          setArea(e.detail.value)
        }}
        style={{
          backgroundColor: fieldBg,
          color: textColor,
          borderRadius: '12px',
          border: fieldBorder,
          minHeight: '120px',
          padding: '8px',
          width: '100%',
        }}
      />
    </view>
  )
}

function SharedStatePanel({
  scope,
  backgroundColor,
}: {
  scope: string
  backgroundColor: string
}) {
  const { sharedState, setNote, bumpCounter } = useSharedStateContext()
  const [draftNote, setDraftNote] = useState(sharedState.note)

  useEffect(() => {
    setDraftNote(sharedState.note)
  }, [sharedState.note])

  return (
    <view
      style={{
        backgroundColor,
        borderRadius: '16rpx',
        padding: '24rpx',
        marginBottom: '24rpx',
      }}
    >
      <text style={{ color: '#fff', fontSize: '28rpx', fontWeight: 'bold', marginBottom: '12rpx' }}>
        {scope} shared context
      </text>
      <text style={{ color: '#ddd', fontSize: '22rpx', marginBottom: '8rpx' }}>
        {`note="${sharedState.note}"`}
      </text>
      <text style={{ color: '#ddd', fontSize: '22rpx', marginBottom: '8rpx' }}>
        {`counter=${sharedState.counter} · version=${sharedState.version}`}
      </text>
      <text style={{ color: '#aaa', fontSize: '22rpx', marginBottom: '16rpx' }}>
        {`updatedBy=${sharedState.updatedBy}`}
      </text>
      <input
        value={draftNote}
        placeholder="shared note"
        enable-scroll-bar
        bindinput={(e) => {
          'background only'
          setDraftNote(e.detail.value)
        }}
        style={{
          backgroundColor: '#151515',
          color: '#fff',
          borderRadius: '12px',
          border: '1px solid #444',
          height: '48px',
          padding: '8px',
          marginBottom: '16rpx',
          width: '100%',
        }}
      />
      <view
        bindtap={() => {
          'background only'
          setNote(draftNote)
        }}
        style={{ ...BUTTON_STYLE, backgroundColor: '#455A64' }}
      >
        <text style={{ color: '#fff', fontSize: '28rpx', fontWeight: 'bold' }}>
          Commit shared note
        </text>
      </view>
      <view
        bindtap={() => {
          'background only'
          bumpCounter()
        }}
        style={{
          ...BUTTON_STYLE,
          backgroundColor: '#2E7D32',
          marginBottom: 0,
        }}
      >
        <text style={{ color: '#fff', fontSize: '28rpx', fontWeight: 'bold' }}>
          Increment shared counter
        </text>
      </view>
    </view>
  )
}

function PeerStackButtons({
  current,
  requestPush,
}: {
  current: StackScreenId | 'root'
  requestPush: (id: StackScreenId) => void
}) {
  const peers = (['a', 'b', 'c', 'd', 'e', 'm3'] as const).filter((id) => id !== current)

  return (
    <>
      {peers.map((id, index) => {
        const meta = SCREEN_META[id]
        return (
          <view
            key={id}
            bindtap={() => {
              'background only'
              requestPush(id)
            }}
            style={{
              ...BUTTON_STYLE,
              backgroundColor: meta.color,
              marginBottom: index === peers.length - 1 ? 0 : BUTTON_STYLE.marginBottom,
            }}
          >
            <text
              style={{ color: '#fff', fontSize: '32rpx', fontWeight: 'bold' }}
            >
              Open {meta.label}
            </text>
          </view>
        )
      })}
    </>
  )
}

function StackScreenChrome({
  title,
  backgroundColor,
  children,
}: {
  title: string
  backgroundColor: string
  children: ReactNode
}) {
  return (
    <SafeArea
      style={{
        backgroundColor,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
      edges={['top', 'bottom', 'left', 'right']}
    >
      <AppBar
        title={title}
        leftAction={false}
        foregroundColor="#fff"
        style={{ backgroundColor }}
      />
      <scroll-view style={{ flex: 1, padding: '48rpx' }}>{children}</scroll-view>
    </SafeArea>
  )
}

function ScreenAProbe() {
  const renderCountRef = useRef(0)
  renderCountRef.current += 1
  const bumps = Math.floor(renderCountRef.current / 60)

  return (
    <text
      style={{
        color: '#ffab40',
        fontSize: '22rpx',
        marginBottom: '16rpx',
      }}
    >
      {`A probe: render #${renderCountRef.current} · bumps every 60 renders: ${bumps}`}
    </text>
  )
}

function SpokeScreen({
  route,
  screenId,
}: {
  route: StackScreenId
  screenId?: string
}) {
  const meta = SCREEN_META[route]
  const isM3 = route === 'm3'
  const backgroundColor =
    route === 'a'
      ? '#2e1e1e'
      : route === 'b'
        ? '#2e1e1e'
        : route === 'c'
          ? '#1a237e'
          : route === 'd'
            ? '#311B92'
            : route === 'e'
              ? '#3e2723'
              : '#5E35B1'
  const fieldBg =
    route === 'a' || route === 'b'
      ? '#252525'
      : route === 'c'
        ? '#0d1440'
        : route === 'd'
          ? '#3d1f6e'
          : route === 'e'
            ? '#4a3228'
            : '#45277b'
  const borderColor =
    route === 'a' || route === 'b'
      ? '#5c5c5c'
      : route === 'c'
        ? '#3949ab'
        : route === 'd'
          ? '#7e57c2'
          : route === 'e'
            ? '#8d6e63'
            : '#7e57c2'
  const [store] = useState<SharedStateStore>(() => createHydratedStore(readHydratedSharedState()))
  const sharedState = useHydratedStoreState(store)

  const requestPush = (id: StackScreenId) => {
    'background only'
    TamerNav.dispatch({ type: 'push-route', route: id })
  }

  const mutateSharedState = (payload: SharedContextMutationPayload) => {
    'background only'
    TamerNav.dispatch({
      type: 'shared-context-mutate',
      screenId,
      payloadJson: stringify(payload),
    })
  }

  const closeScreen = () => {
    'background only'
    TamerNav.pop({
      screenId,
      payloadJson: stringify({
        route,
        sharedState,
      }),
    })
  }

  useEffect(() => {
    console.log('[example][spoke subscribe attach]', { screenId })
    return subscribeHydratedStateJson((stateJson) => {
      console.log('[example][spoke received]', { screenId, stateJson })
      applyHydratedSnapshot(store, parseSharedStateJson(stateJson))
    })
  }, [store])

  useLynxGlobalEventListener('onGlobalPropsChanged', () => {
    console.log('[example][spoke control onGlobalPropsChanged]', { screenId })
  })

  const actions: SharedStateActions = {
    setNote(note: string) {
      mutateSharedState({
        note,
        updatedBy: `screen-${route}`,
      })
    },
    bumpCounter() {
      mutateSharedState({
        counterDelta: 1,
        updatedBy: `screen-${route}`,
      })
    },
  }

  return (
    <SharedStateProvider store={store} actions={actions}>
      <StackScreenChrome
        title={`Screen ${meta.label}`}
        backgroundColor={backgroundColor}
      >
        <InsetsDebug />
        <text
          style={{
            color: '#ccc',
            fontSize: '24rpx',
            marginBottom: '8rpx',
          }}
        >
          {`route=${route} · screenId=${screenId ?? '—'}`}
        </text>
        <text
          style={{
            color: '#aaa',
            fontSize: '22rpx',
            marginBottom: '16rpx',
          }}
        >
          Stack UI is hydrated from a local external store adapter. It only changes when root sends a new opaque snapshot through globalProps.
        </text>

        <SharedStatePanel scope={`screen ${meta.label}`} backgroundColor={fieldBg} />

        {route === 'a' ? <ScreenAProbe /> : null}

        {!isM3 ? (
          <SampleInputFields
            fieldBg={fieldBg}
            borderColor={borderColor}
            labelColor="#e0e0e0"
            textColor="#fff"
          />
        ) : null}

        <view
          bindtap={closeScreen}
          style={{
            ...BUTTON_STYLE,
            backgroundColor: '#c62828',
            marginBottom: '24rpx',
          }}
        >
          <text style={{ color: '#fff', fontSize: '32rpx', fontWeight: 'bold' }}>
            Close {meta.label}
          </text>
        </view>

        {!isM3 ? (
          <PeerStackButtons current={route} requestPush={requestPush} />
        ) : null}

        {isM3 ? (
          <view style={{ paddingTop: '8rpx' }}>
            <M3PageContent />
            <view style={{ marginTop: '24rpx' }}>
              <PeerStackButtons current={route} requestPush={requestPush} />
            </view>
          </view>
        ) : null}
      </StackScreenChrome>
    </SharedStateProvider>
  )
}

function CoordinatorScreen() {
  const [routeStack, setRouteStack] = useState<StackEntry[]>([])
  const [store] = useState<SharedStateStore>(() => createHydratedStore(DEFAULT_SHARED_STATE))
  const sharedState = useHydratedStoreState(store)
  const [lastPopResult, setLastPopResult] = useState('—')
  const routeStackRef = useRef(routeStack)
  const pushCounterRef = useRef(0)
  routeStackRef.current = routeStack

  const applySharedStateMutation = (payload: SharedContextMutationPayload) => {
    store.mutate(payload)
  }

  const pushRoute = (route: StackScreenId) => {
    'background only'
    const screenId = `${route}-${pushCounterRef.current++}`
    setRouteStack((previous) => [...previous, { route, screenId }])
    TamerNav.push({
      src: NATIVE_BUNDLE_SRC,
      screenId,
      initData: { route, screenId },
      stateJson: buildSharedStateJson(store.getState()),
    })
  }

  useEffect(() => {
    if (routeStack.length === 0) return
    const json = buildSharedStateJson(sharedState)
    console.log('[example][coordinator broadcast]', {
      stackLen: routeStack.length,
      sharedStateRef: sharedState,
      json,
    })
    TamerNav.update({ stateJson: json })
  }, [routeStack.length, sharedState])

  useLynxGlobalEventListener('tamer-nav:dispatch', (payload?: DispatchPayload) => {
    const action = parseDispatchAction(payload)
    if (!action) return

    if (action.type === 'push-route') {
      pushRoute(action.route)
      return
    }

    const mutation = parseJson<SharedContextMutationPayload>(action.payloadJson, {})
    applySharedStateMutation(mutation)
  })

  useLynxGlobalEventListener('tamer-nav:popped', (payload?: PoppedPayload) => {
    setRouteStack((previous) => {
      if (payload?.screenId) {
        return previous.filter((entry) => entry.screenId !== payload.screenId)
      }
      return previous.length > 0 ? previous.slice(0, -1) : previous
    })

    if (typeof payload?.result === 'string' && payload.result.length > 0) {
      setLastPopResult(payload.result)
    }
  })

  useBackHandler(() => {
    if (routeStackRef.current.length === 0) return false
    TamerNav.pop({ source: 'system-back' })
    return true
  })

  const actions: SharedStateActions = {
    setNote(note: string) {
      applySharedStateMutation({
        note,
        updatedBy: 'root',
      })
    },
    bumpCounter() {
      applySharedStateMutation({
        counterDelta: 1,
        updatedBy: 'root',
      })
    },
  }

  return (
    <SharedStateProvider store={store} actions={actions}>
      <Screen style={{ backgroundColor: '#121212' }}>
        <StackScreenChrome
          title="native nav stack"
          backgroundColor="#121212"
        >
          <InsetsDebug />

          <text
            style={{
              color: '#aaa',
              fontSize: '26rpx',
              marginBottom: '12rpx',
            }}
          >
            Root owns the authoritative store. It serializes that store to one opaque snapshot string and pushes it into every open stack.
          </text>
          <text
            style={{
              color: '#888',
              fontSize: '22rpx',
              marginBottom: '8rpx',
            }}
          >
            {`native stack: [${routeStack.map((entry) => `${entry.route}:${entry.screenId}`).join(', ') || '—'}]`}
          </text>
          <text
            style={{
              color: '#888',
              fontSize: '22rpx',
              marginBottom: '8rpx',
            }}
          >
            This mirrors future router/provider wiring: the bridge only moves serialized snapshots and opaque mutation payloads.
          </text>
          <text
            style={{
              color: '#888',
              fontSize: '22rpx',
              marginBottom: '24rpx',
            }}
          >
            {`last pop result: ${lastPopResult}`}
          </text>

          <SharedStatePanel scope="root" backgroundColor="#1E1E1E" />

          <SampleInputFields
            fieldBg="#1e1e1e"
            borderColor="#444"
            labelColor="#aaa"
            textColor="#fff"
          />

          <view
            bindtap={() => {
              'background only'
              pushRoute('a')
            }}
            style={{ ...BUTTON_STYLE, backgroundColor: SCREEN_META.a.color }}
          >
            <text style={{ color: '#fff', fontSize: '32rpx', fontWeight: 'bold' }}>
              Push A
            </text>
          </view>
          <view
            bindtap={() => {
              'background only'
              pushRoute('b')
            }}
            style={{ ...BUTTON_STYLE, backgroundColor: SCREEN_META.b.color }}
          >
            <text style={{ color: '#fff', fontSize: '32rpx', fontWeight: 'bold' }}>
              Push B
            </text>
          </view>
          <view
            bindtap={() => {
              'background only'
              pushRoute('c')
            }}
            style={{ ...BUTTON_STYLE, backgroundColor: SCREEN_META.c.color }}
          >
            <text style={{ color: '#fff', fontSize: '32rpx', fontWeight: 'bold' }}>
              Push C
            </text>
          </view>
          <view
            bindtap={() => {
              'background only'
              pushRoute('d')
            }}
            style={{ ...BUTTON_STYLE, backgroundColor: SCREEN_META.d.color }}
          >
            <text style={{ color: '#fff', fontSize: '32rpx', fontWeight: 'bold' }}>
              Push D
            </text>
          </view>
          <view
            bindtap={() => {
              'background only'
              pushRoute('e')
            }}
            style={{ ...BUTTON_STYLE, backgroundColor: SCREEN_META.e.color }}
          >
            <text style={{ color: '#fff', fontSize: '32rpx', fontWeight: 'bold' }}>
              Push E
            </text>
          </view>
          <view
            bindtap={() => {
              'background only'
              pushRoute('m3')
            }}
            style={{
              ...BUTTON_STYLE,
              backgroundColor: SCREEN_META.m3.color,
            }}
          >
            <text style={{ color: '#fff', fontSize: '32rpx', fontWeight: 'bold' }}>
              Push M3
            </text>
          </view>
        </StackScreenChrome>
      </Screen>
    </SharedStateProvider>
  )
}

export default function ExampleStack() {
  const initData = (useInitData() ?? {}) as ScreenInitData
  const route = initData.route

  if (isStackScreenId(route)) {
    return <SpokeScreen route={route} screenId={initData.screenId} />
  }

  return (
    <BackHandlerProvider>
      <CoordinatorScreen />
    </BackHandlerProvider>
  )
}
