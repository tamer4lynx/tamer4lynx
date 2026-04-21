import '@lynx-js/react/debug'
import '@tamer4lynx/tamer-transports/lynx'
import { root } from '@lynx-js/react'
import Stack from './Stack.jsx'
import ExampleStack from './example_stack.jsx'

import { FileRouterApp } from './file-router-app.js'
const testExample: number = 1

let component: JSX.Element;

switch (testExample) {
  case 0:
    component = <Stack />;
    break;
  case 1:
    component = <ExampleStack />;
    break;
  default:
    component = <FileRouterApp />;
    break;
}

root.render(component as JSX.Element);

if (import.meta.webpackHot) {
  import.meta.webpackHot.accept()
}
