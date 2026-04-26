import { createTamerStateSync } from '@tamer4lynx/tamer-router'

import { demoStore } from './demo-store.js'

export const demoTamerStateSync = createTamerStateSync('demo', {
  getState: () => demoStore.getState(),
  subscribe: (fn) => demoStore.subscribe(fn),
  hydrate: (json) => {
    'background only'
    try {
      const data = JSON.parse(json) as unknown
      if (data != null && typeof data === 'object') {
        demoStore.dispatch({ type: '@@tamer/HYDRATE', payload: data })
      }
    } catch {
      // ignore
    }
  },
  send: (action) => {
    'background only'
    demoStore.dispatch(action)
  },
})
