type AbortListener = (event?: { type: 'abort'; target: AbortSignalShim }) => void

class AbortSignalShim {
  aborted = false
  onabort: AbortListener | null = null
  reason: unknown = undefined

  private listeners = new Set<AbortListener>()

  addEventListener(type: string, listener: AbortListener | null | undefined): void {
    if (type !== 'abort' || !listener) return
    this.listeners.add(listener)
  }

  removeEventListener(type: string, listener: AbortListener | null | undefined): void {
    if (type !== 'abort' || !listener) return
    this.listeners.delete(listener)
  }

  dispatchEvent(event: { type: 'abort'; target: AbortSignalShim }): boolean {
    if (event.type !== 'abort') return true
    this.listeners.forEach((listener) => listener(event))
    this.onabort?.(event)
    return true
  }

  throwIfAborted(): void {
    if (!this.aborted) return
    throw this.reason ?? new Error('Aborted')
  }
}

class AbortControllerShim {
  readonly signal = new AbortSignalShim()

  abort(reason?: unknown): void {
    if (this.signal.aborted) return
    this.signal.aborted = true
    this.signal.reason = reason
    this.signal.dispatchEvent({ type: 'abort', target: this.signal })
  }
}

if (typeof globalThis.AbortController === 'undefined') {
  ;(globalThis as typeof globalThis & { AbortController: typeof AbortControllerShim }).AbortController = AbortControllerShim
}

if (typeof globalThis.AbortSignal === 'undefined') {
  ;(globalThis as typeof globalThis & { AbortSignal: typeof AbortSignalShim }).AbortSignal = AbortSignalShim
}
