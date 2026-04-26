export type DemoState = { count: number }

function createDemoStore() {
  let state: DemoState = { count: 0 }
  const listeners = new Set<() => void>()
  return {
    getState: () => state,
    subscribe: (fn: () => void) => {
      listeners.add(fn)
      return () => {
        listeners.delete(fn)
      }
    },
    dispatch: (action: unknown) => {
      const a = action as { type?: string; payload?: unknown }
      if (a?.type === '@@tamer/HYDRATE' && a.payload != null && typeof a.payload === 'object') {
        const pl = a.payload as Partial<DemoState>
        state = { count: typeof pl.count === 'number' ? pl.count : 0 }
      } else if (a?.type === 'demo/inc') {
        state = { count: state.count + 1 }
      }
      for (const l of listeners) l()
    },
  }
}

export const demoStore = createDemoStore()
