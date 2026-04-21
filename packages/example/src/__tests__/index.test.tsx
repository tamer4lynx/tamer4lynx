// Copyright 2024 The Lynx Authors. All rights reserved.
// Licensed under the Apache License Version 2.0 that can be found in the
// LICENSE file in the root directory of this source tree.
import '@testing-library/jest-dom'
import { expect, test, vi } from 'vitest'
import { render, getQueriesForElement } from '@lynx-js/react/testing-library'

import { App } from '../App.js'

test('App', async () => {
  const cb = vi.fn()

  render(
    <App
      onMounted={() => {
        cb(`__MAIN_THREAD__: ${__MAIN_THREAD__}`)
      }}
    />,
  )
  expect(cb).toBeCalledTimes(1)
  expect(cb.mock.calls).toMatchInlineSnapshot(`
    [
      [
        "__MAIN_THREAD__: false",
      ],
    ]
  `)
  expect(elementTree.root).toMatchInlineSnapshot(`
    <page>
      <view>
        <view
          class="App"
        >
          <view
            class="Banner"
          >
            <view
              class="Logo"
            >
              <image
                class="Logo--lynx"
                src="/src/assets/lynx-logo.png"
              />
            </view>
            <text
              class="Title"
            >
              React
            </text>
            <text
              class="Subtitle"
            >
              on Lynx
            </text>
          </view>
          <view
            class="Content"
          >
            <text
              class="Description"
            >
              Server Messages:
            </text>
            <wrapper />
          </view>
          <view
            style="flex:1"
          />
        </view>
      </view>
    </page>
  `)
  const {
    findByText,
  } = getQueriesForElement(elementTree.root!)
  const element = await findByText('Server Messages:')
  expect(element).toBeInTheDocument()
  expect(element).toMatchInlineSnapshot(`
    <text
      class="Description"
    >
      Server Messages:
    </text>
  `)
})
