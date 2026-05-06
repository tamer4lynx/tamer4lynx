import { create } from 'zustand'

console.log('[TamerHeap] demo-store module-eval', Math.random())

export type DemoState = {
  count: number
  increment: () => void
}

export const useDemoStore = create<DemoState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}))

export function useDemoState(): DemoState {
  return useDemoStore()
}

export function incrementDemoStore(): void {
  'background only'
  useDemoStore.getState().increment()
}
