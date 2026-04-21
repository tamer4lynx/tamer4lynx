import { useRef } from '@lynx-js/react';

export function useSyncNavigationChrome(
  setStatusBar: (o: {
    color?: string;
    style?: 'light' | 'dark' | 'auto';
  }) => void,
  setNavigationBar: (o: {
    color: string;
    style?: 'light' | 'dark' | 'auto';
  }) => void,
  barBackground: string,
  isDark: boolean,
): void {
  const sigRef = useRef<string | null>(null);
  const sig = `${barBackground}:${isDark ? 'd' : 'l'}`;
  if (sigRef.current !== sig) {
    sigRef.current = sig;
    const style = isDark ? 'light' : 'dark';
    setStatusBar({ color: barBackground, style });
    setNavigationBar({ color: barBackground, style });
  }
}
