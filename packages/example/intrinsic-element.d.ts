/// <reference path="../tamer-text-input/src/lynx-elements.d.ts" />
import * as Lynx from "@lynx-js/types";

declare module "@lynx-js/types" {
  interface IntrinsicElements extends Lynx.IntrinsicElements {
    svg: {
      content?: string;
      src?: string;
      style?: string | Lynx.CSSProperties;
    };
    input: Lynx.ViewProps & {
      placeholder?: string;
      value?: string;
      type?: "text" | "number" | "digit" | "password" | "tel" | "email";
      maxlength?: number;
      readonly?: boolean;
      disabled?: boolean;
      "confirm-type"?: "search" | "send" | "go" | "done" | "next";
      "input-filter"?: string;
      "show-soft-input-on-focus"?: boolean;
      "android-fullscreen-mode"?: boolean;
      "ios-auto-correct"?: boolean;
      "ios-spell-check"?: boolean;
      bindinput?: (e: { detail: { value: string; selectionStart: number; selectionEnd: number; isComposing?: boolean } }) => void;
      bindfocus?: (e: { detail: { value: string } }) => void;
      bindblur?: (e: { detail: { value: string } }) => void;
      bindconfirm?: (e: { detail: { value: string } }) => void;
      bindselection?: (e: { detail: { selectionStart: number; selectionEnd: number } }) => void;
    };
    textarea: Lynx.ViewProps & {
      placeholder?: string;
      value?: string;
      type?: "text" | "number" | "digit" | "tel" | "email";
      maxlength?: number;
      maxlines?: number;
      readonly?: boolean;
      disabled?: boolean;
      "confirm-type"?: "search" | "send" | "go" | "done" | "next";
      "input-filter"?: string;
      "line-spacing"?: number;
      "show-soft-input-on-focus"?: boolean;
      "enable-scroll-bar"?: boolean;
      "android-fullscreen-mode"?: boolean;
      bounces?: boolean;
      "ios-auto-correct"?: boolean;
      "ios-spell-check"?: boolean;
      bindinput?: (e: { detail: { value: string; selectionStart: number; selectionEnd: number; isComposing?: boolean } }) => void;
      bindfocus?: (e: { detail: { value: string } }) => void;
      bindblur?: (e: { detail: { value: string } }) => void;
      bindconfirm?: (e: { detail: { value: string } }) => void;
      bindselection?: (e: { detail: { selectionStart: number; selectionEnd: number } }) => void;
    };
  }
}

declare let NativeModules: {
  [moduleName: string]: {
    [methodName: string]: (...args: any[]) => any;
  };
};