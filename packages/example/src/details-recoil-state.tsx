import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from '@lynx-js/react';
import { TamerNav } from '@tamer4lynx/tamer-navigation';
import {
  createTamerStateSync,
  useTamerStateSnapshot,
} from '@tamer4lynx/tamer-router';

export type DetailsRecoilState = {
  count: number;
  note: string;
  updatedBy: string;
};

const DEFAULT_DETAILS_RECOIL_STATE: DetailsRecoilState = {
  count: 0,
  note: 'initial',
  updatedBy: 'default',
};

type DetailsRecoilAction =
  | { type: '@@tamer/HYDRATE'; payload?: unknown }
  | { type: 'details/inc'; source?: string }
  | { type: 'details/set-note'; note?: string; source?: string };

function normalizeDetailsRecoilState(value: unknown): DetailsRecoilState {
  if (!value || typeof value !== 'object') return DEFAULT_DETAILS_RECOIL_STATE;
  const raw = value as Partial<DetailsRecoilState>;
  return {
    count: typeof raw.count === 'number' ? raw.count : 0,
    note: typeof raw.note === 'string' ? raw.note : DEFAULT_DETAILS_RECOIL_STATE.note,
    updatedBy:
      typeof raw.updatedBy === 'string'
        ? raw.updatedBy
        : DEFAULT_DETAILS_RECOIL_STATE.updatedBy,
  };
}

function createDetailsRecoilStore() {
  let state = DEFAULT_DETAILS_RECOIL_STATE;
  const listeners = new Set<() => void>();
  const emit = () => {
    for (const listener of listeners) listener();
  };

  return {
    getState: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispatch: (action: unknown) => {
      const a = action as DetailsRecoilAction;
      if (a?.type === '@@tamer/HYDRATE') {
        state = normalizeDetailsRecoilState(a.payload);
      } else if (a?.type === 'details/inc') {
        state = {
          ...state,
          count: state.count + 1,
          updatedBy: a.source ?? 'details/inc',
        };
      } else if (a?.type === 'details/set-note') {
        state = {
          ...state,
          note: typeof a.note === 'string' ? a.note : state.note,
          updatedBy: a.source ?? 'details/set-note',
        };
      } else {
        return;
      }
      emit();
    },
  };
}

export const detailsRecoilStore = createDetailsRecoilStore();
const DetailsRecoilContext = createContext<{
  value: DetailsRecoilState;
  setValue: (next: DetailsRecoilState | ((prev: DetailsRecoilState) => DetailsRecoilState)) => void;
} | null>(null);

export const detailsRecoilTamerStateSync = createTamerStateSync(
  'detailsRecoil',
  {
    getState: () => detailsRecoilStore.getState(),
    subscribe: (listener) => detailsRecoilStore.subscribe(listener),
    hydrate: (json) => {
      'background only';
      try {
        detailsRecoilStore.dispatch({
          type: '@@tamer/HYDRATE',
          payload: JSON.parse(json),
        });
      } catch {
        // ignore invalid native payloads
      }
    },
    send: (action) => {
      'background only';
      detailsRecoilStore.dispatch(action);
    },
  },
);

function stringifyState(value: DetailsRecoilState): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '{}';
  }
}

function DetailsRecoilSyncBridge() {
  const snapshot = useTamerStateSnapshot('detailsRecoil');
  const ctx = useContext(DetailsRecoilContext);
  const lastAppliedJson = useRef('');

  if (!ctx) {
    throw new Error('DetailsRecoilSyncBridge must be used inside DetailsRecoilProvider');
  }

  const { value, setValue } = ctx;

  useEffect(() => {
    return detailsRecoilStore.subscribe(() => {
      const next = detailsRecoilStore.getState();
      const nextJson = stringifyState(next);
      if (nextJson === lastAppliedJson.current) return;
      lastAppliedJson.current = nextJson;
      setValue(next);
    });
  }, [setValue]);

  useEffect(() => {
    if (!snapshot || typeof snapshot !== 'object') return;
    const next = normalizeDetailsRecoilState(snapshot);
    const nextJson = stringifyState(next);
    if (nextJson === lastAppliedJson.current) return;
    lastAppliedJson.current = nextJson;
    setValue(next);
  }, [snapshot, setValue]);

  useEffect(() => {
    const valueJson = stringifyState(value);
    if (valueJson === lastAppliedJson.current) return;
    lastAppliedJson.current = valueJson;
    detailsRecoilStore.dispatch({ type: '@@tamer/HYDRATE', payload: value });
  }, [value]);

  return null;
}

export function DetailsRecoilProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<DetailsRecoilState>(detailsRecoilStore.getState());
  const contextValue = useMemo(
    () => ({
      value,
      setValue: (next: DetailsRecoilState | ((prev: DetailsRecoilState) => DetailsRecoilState)) => {
        setValue((prev) => (typeof next === 'function' ? (next as (prev: DetailsRecoilState) => DetailsRecoilState)(prev) : next));
      },
    }),
    [value],
  );

  return (
    <DetailsRecoilContext.Provider value={contextValue}>
      <DetailsRecoilSyncBridge />
      {children as any}
    </DetailsRecoilContext.Provider>
  );
}

export function useDetailsRecoilState() {
  const ctx = useContext(DetailsRecoilContext);
  if (!ctx) {
    throw new Error('useDetailsRecoilState must be used inside DetailsRecoilProvider');
  }
  return [ctx.value, ctx.setValue] as const;
}

export function dispatchDetailsRecoilMutation(source: string): void {
  'background only';
  TamerNav.dispatch({
    type: 'shared-context-mutate',
    payloadJson: JSON.stringify({
      tamerSyncKey: 'detailsRecoil',
      type: 'details/inc',
      source,
    }),
  });
}
