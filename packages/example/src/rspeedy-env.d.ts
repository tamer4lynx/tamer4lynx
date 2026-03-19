/// <reference types="@lynx-js/rspeedy/client" />
import type React from 'react'
import type { ViewProps } from '@lynx-js/types'

declare module '@lynx-js/react/jsx-runtime' {
  namespace JSX {
    interface IntrinsicElements {
      'app-bar': { title?: string; leading?: 'back' | 'close' | React.ReactNode; onBack?: () => void; trailing?: React.ReactNode; mode?: 'small' | 'medium' | 'large'; elevated?: boolean; style?: Record<string, unknown> }
      icon: { icon: string; set?: 'material' | 'fontawesome' | 'fa'; iconColor?: string; size?: number; style?: Record<string, unknown> };
      input: ViewProps & {
        placeholder?: string;
        value?: string;
        type?: 'text' | 'number' | 'digit' | 'password' | 'tel' | 'email';
        maxlength?: number;
        readonly?: boolean;
        disabled?: boolean;
        'confirm-type'?: 'search' | 'send' | 'go' | 'done' | 'next';
        'input-filter'?: string;
        'show-soft-input-on-focus'?: boolean;
        'android-fullscreen-mode'?: boolean;
        'ios-auto-correct'?: boolean;
        'ios-spell-check'?: boolean;
        bindinput?: (e: { detail: { value: string; selectionStart: number; selectionEnd: number; isComposing?: boolean } }) => void;
        bindfocus?: (e: { detail: { value: string } }) => void;
        bindblur?: (e: { detail: { value: string } }) => void;
        bindconfirm?: (e: { detail: { value: string } }) => void;
        bindselection?: (e: { detail: { selectionStart: number; selectionEnd: number } }) => void;
      };
      textarea: ViewProps & {
        placeholder?: string;
        value?: string;
        type?: 'text' | 'number' | 'digit' | 'tel' | 'email';
        maxlength?: number;
        maxlines?: number;
        readonly?: boolean;
        disabled?: boolean;
        'confirm-type'?: 'search' | 'send' | 'go' | 'done' | 'next';
        'input-filter'?: string;
        'line-spacing'?: number;
        'show-soft-input-on-focus'?: boolean;
        'enable-scroll-bar'?: boolean;
        'android-fullscreen-mode'?: boolean;
        bounces?: boolean;
        'ios-auto-correct'?: boolean;
        'ios-spell-check'?: boolean;
        bindinput?: (e: { detail: { value: string; selectionStart: number; selectionEnd: number; isComposing?: boolean } }) => void;
        bindfocus?: (e: { detail: { value: string } }) => void;
        bindblur?: (e: { detail: { value: string } }) => void;
        bindconfirm?: (e: { detail: { value: string } }) => void;
        bindselection?: (e: { detail: { selectionStart: number; selectionEnd: number } }) => void;
      };
    }
  }
}
