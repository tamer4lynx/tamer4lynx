import { useMemo } from '@lynx-js/react';
import type { ThemeColors } from '@tamer4lynx/tamer-system-ui';
import { useThemeColors } from '@tamer4lynx/tamer-system-ui';

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
    const surface = os?.surface ?? FALLBACK.surface;
    const surfaceContainer = os?.surfaceContainer ?? FALLBACK.surfaceContainer;
    const onSurface = os?.onSurface ?? FALLBACK.onSurface;
    const onSurfaceVariant = os?.onSurfaceVariant ?? FALLBACK.onSurfaceVariant;
    const primary = os?.primary ?? FALLBACK.primary;
    const secondaryContainer =
      os?.secondaryContainer ?? FALLBACK.secondaryContainer;
    const onSecondaryContainer =
      os?.onSecondaryContainer ?? FALLBACK.onSecondaryContainer;
    return {
      theme: os,
      surface,
      surfaceContainer,
      background: os?.background ?? FALLBACK.background,
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
    height: '100%',
    minHeight: 0,
    backgroundColor: surface,
  };
}
