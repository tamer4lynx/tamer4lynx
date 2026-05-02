import { useMemo } from '@lynx-js/react';
import type { ThemeColors } from '@tamer4lynx/tamer-system-ui';
import { useThemeColors, readBootstrapThemeColors } from '@tamer4lynx/tamer-system-ui';

const FALLBACK: {
  surface: string;
  surfaceContainer: string;
  background: string;
  onSurface: string;
  onSurfaceVariant: string;
  primary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
} = {
  surface: '#0a0f0e',
  surfaceContainer: '#131b1a',
  background: '#0a0f0e',
  onSurface: '#dce8e5',
  onSurfaceVariant: '#a2adab',
  primary: '#9cd1c9',
  secondaryContainer: '#27403d',
  onSecondaryContainer: '#bce9e0',
};

/** Embed as `lynx.__globalProps.themeColors` (object or JSON string) so the first frame matches this palette before async native theme arrives. */
export const EXAMPLE_PALETTE_GLOBAL_THEME: ThemeColors = {
  isDark: true,
  background: FALLBACK.background,
  surface: FALLBACK.surface,
  surfaceContainer: FALLBACK.surfaceContainer,
  onSurface: FALLBACK.onSurface,
  onSurfaceVariant: FALLBACK.onSurfaceVariant,
  primary: FALLBACK.primary,
  secondaryContainer: FALLBACK.secondaryContainer,
  onSecondaryContainer: FALLBACK.onSecondaryContainer,
};

export interface ExamplePalette {
  theme: ThemeColors | null;
  surface: string;
  surfaceContainer: string;
  background: string;
  onSurface: string;
  onSurfaceVariant: string;
  primary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  barBackground: string;
  barForeground: string;
}

export function useExamplePalette(): ExamplePalette {
  const os = useThemeColors();
  return useMemo((): ExamplePalette => {
    const theme = os ?? readBootstrapThemeColors();
    const surface = theme?.surface ?? FALLBACK.surface;
    const surfaceContainer = theme?.surfaceContainer ?? FALLBACK.surfaceContainer;
    const onSurface = theme?.onSurface ?? FALLBACK.onSurface;
    const onSurfaceVariant = theme?.onSurfaceVariant ?? FALLBACK.onSurfaceVariant;
    const primary = theme?.primary ?? FALLBACK.primary;
    const secondaryContainer =
      theme?.secondaryContainer ?? FALLBACK.secondaryContainer;
    const onSecondaryContainer =
      theme?.onSecondaryContainer ?? FALLBACK.onSecondaryContainer;
    return {
      theme,
      surface,
      surfaceContainer,
      background: theme?.background ?? FALLBACK.background,
      onSurface,
      onSurfaceVariant,
      primary,
      secondaryContainer,
      onSecondaryContainer,
      barBackground: surfaceContainer,
      barForeground: onSurface,
    };
  }, [os]);
}

export function pageShellStyle(surface: string) {
  return {
    display: 'flex' as const,
    flexDirection: 'column' as const,
    minHeight: '0px',
    width: '100%',
    backgroundColor: surface,
  };
}

export function pageSlotStyle(surface: string) {
  return {
    ...pageShellStyle(surface),
    flex: 1,
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: '0px',
  };
}
