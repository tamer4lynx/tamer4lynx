import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from '@lynx-js/react';
import { TamerNav } from '@tamer4lynx/tamer-navigation';
import { createTamerProviderConnector } from '@tamer4lynx/tamer-router';
import { atom, RecoilEnv } from 'recoil';

// Lynx React compat does not expose the React internals that Recoil probes for this mode.
RecoilEnv.RECOIL_GKS_ENABLED.delete('recoil_sync_external_store');

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

export const detailsRecoilAtom = atom<DetailsRecoilState>({
  key: 'tamer-example-details-recoil',
  default: DEFAULT_DETAILS_RECOIL_STATE,
});

const DetailsRecoilContext = createContext<{
  value: DetailsRecoilState;
  setValue: (next: DetailsRecoilState | ((prev: DetailsRecoilState) => DetailsRecoilState)) => void;
} | null>(null);

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

function stringifyState(value: DetailsRecoilState): string {
  try {
    return JSON.stringify(value);
  } catch {
    return '{}';
  }
}

function areDetailsRecoilStatesEqual(a: DetailsRecoilState, b: DetailsRecoilState): boolean {
  return a.count === b.count && a.note === b.note && a.updatedBy === b.updatedBy;
}

function createDetailsRecoilConnectorStore() {
  let state = DEFAULT_DETAILS_RECOIL_STATE;
  const listeners = new Set<() => void>();
  const emit = () => {
    for (const listener of listeners) listener();
  };
  const setState = (next: DetailsRecoilState) => {
    if (areDetailsRecoilStatesEqual(state, next)) return;
    state = next;
    emit();
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
        setState(normalizeDetailsRecoilState(a.payload));
      } else if (a?.type === 'details/inc') {
        setState({
          ...state,
          count: state.count + 1,
          updatedBy: a.source ?? 'details/inc',
        });
      } else if (a?.type === 'details/set-note') {
        setState({
          ...state,
          note: typeof a.note === 'string' ? a.note : state.note,
          updatedBy: a.source ?? 'details/set-note',
        });
      }
    },
  };
}

export const detailsRecoilConnectorStore = createDetailsRecoilConnectorStore();

export const detailsRecoilProviderConnector = createTamerProviderConnector(
  'detailsRecoil',
  {
    getState: () => detailsRecoilConnectorStore.getState(),
    subscribe: (listener) => detailsRecoilConnectorStore.subscribe(listener),
    hydrate: (json) => {
      'background only';
      try {
        detailsRecoilConnectorStore.dispatch({
          type: '@@tamer/HYDRATE',
          payload: JSON.parse(json),
        });
      } catch {
        // ignore invalid native payloads
      }
    },
    send: (action) => {
      'background only';
      detailsRecoilConnectorStore.dispatch(action);
    },
  },
);

function DetailsRecoilConnectorBridge() {
  const ctx = useContext(DetailsRecoilContext);
  const lastAppliedJson = useRef('');
  const skipNextProviderWrite = useRef(true);

  if (!ctx) {
    throw new Error('DetailsRecoilConnectorBridge must be used inside DetailsRecoilProvider');
  }

  const { value, setValue } = ctx;

  useEffect(() => {
    const initial = detailsRecoilConnectorStore.getState();
    lastAppliedJson.current = stringifyState(initial);
    setValue(initial);

    return detailsRecoilConnectorStore.subscribe(() => {
      const next = detailsRecoilConnectorStore.getState();
      const nextJson = stringifyState(next);
      if (nextJson === lastAppliedJson.current) return;
      lastAppliedJson.current = nextJson;
      setValue(next);
    });
  }, [setValue]);

  useEffect(() => {
    if (skipNextProviderWrite.current) {
      skipNextProviderWrite.current = false;
      return;
    }
    const valueJson = stringifyState(value);
    if (valueJson === lastAppliedJson.current) return;
    lastAppliedJson.current = valueJson;
    detailsRecoilConnectorStore.dispatch({
      type: '@@tamer/HYDRATE',
      payload: value,
    });
  }, [value]);

  return null;
}

export function DetailsRecoilProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<DetailsRecoilState>(
    detailsRecoilConnectorStore.getState(),
  );
  const setConnectorValue = useCallback(
    (next: DetailsRecoilState | ((prev: DetailsRecoilState) => DetailsRecoilState)) => {
      setValue((prev) =>
        typeof next === 'function'
          ? (next as (prev: DetailsRecoilState) => DetailsRecoilState)(prev)
          : next,
      );
    },
    [],
  );
  const contextValue = useMemo(
    () => ({
      value,
      setValue: setConnectorValue,
    }),
    [setConnectorValue, value],
  );

  return (
    <DetailsRecoilContext.Provider value={contextValue}>
      <DetailsRecoilConnectorBridge />
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
