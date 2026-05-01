import { create } from 'zustand'

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
