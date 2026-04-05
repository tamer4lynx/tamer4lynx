import '@testing-library/jest-dom'
import { expect, test, vi } from 'vitest'
import { act, fireEvent, getQueriesForElement, render } from '@lynx-js/react/testing-library'
import { FabMenu } from '@tamer4lynx/tamer-app-shell'

/** Same items as `packages/example/src/pages/m3/index.tsx` FAB Menu demo */
const m3FabMenuItems = [
  { icon: 'photo_camera', label: 'Camera', onTap: vi.fn() },
  { icon: 'image', label: 'Gallery', onTap: vi.fn() },
  { icon: 'mic', label: 'Audio', onTap: vi.fn() },
]

test('FabMenu (m3 demo): closed hides actions; open shows them; item tap fires; close clears', async () => {
  await act(async () => {
    render(<FabMenu icon="add" items={m3FabMenuItems} />)
  })

  const { getByTestId, queryByText, findByText } = getQueriesForElement(elementTree.root!)

  expect(queryByText('Camera')).toBeNull()
  expect(queryByText('Gallery')).toBeNull()
  expect(queryByText('Audio')).toBeNull()

  await act(async () => {
    fireEvent.click(getByTestId('fab-menu-trigger'))
  })

  expect(await findByText('Camera')).toBeInTheDocument()
  expect(await findByText('Gallery')).toBeInTheDocument()
  expect(await findByText('Audio')).toBeInTheDocument()

  await act(async () => {
    fireEvent.click(getByTestId('fab-menu-item-0'))
  })
  expect(m3FabMenuItems[0].onTap).toHaveBeenCalledTimes(1)

  await act(async () => {
    fireEvent.click(getByTestId('fab-menu-trigger'))
  })
  expect(queryByText('Camera')).toBeNull()
})
