import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { describe, expect, it, vi } from 'vitest'

function component() {
  let definition: any
  const switchTab = vi.fn()
  runInNewContext(readFileSync('src/custom-tab-bar/index.js', 'utf8'), {
    Component: (value: any) => { definition = value },
    wx: { switchTab }, getCurrentPages: () => [{ route: 'pages/foods/index' }],
  })
  const instance = { ...definition.methods, data: { ...definition.data }, setData: vi.fn(function (this: any, patch: any) { Object.assign(this.data, patch) }) }
  return { instance, switchTab }
}

describe('native navigation component', () => {
  it('ignores tapping the current page and invalid indexes', () => {
    const { instance, switchTab } = component()
    instance.syncSelected()
    instance.switchTab({ currentTarget: { dataset: { index: 1 } } })
    expect(switchTab).not.toHaveBeenCalled()
    expect(() => instance.switchTab({ currentTarget: { dataset: { index: 99 } } })).not.toThrow()
  })
  it('coalesces taps until navigation finishes and never updates the departed component', () => {
    const { instance, switchTab } = component()
    instance.syncSelected()
    instance.switchTab({ currentTarget: { dataset: { index: 2 } } })
    instance.switchTab({ currentTarget: { dataset: { index: 3 } } })
    expect(switchTab).toHaveBeenCalledTimes(1)
    const callbacks = switchTab.mock.calls[0][0]
    instance.setData.mockClear()
    callbacks.success?.()
    expect(instance.setData).not.toHaveBeenCalled()
    callbacks.complete?.()
    instance.switchTab({ currentTarget: { dataset: { index: 3 } } })
    expect(switchTab).toHaveBeenCalledTimes(2)
  })
  it('does not rewrite an unchanged selected state', () => {
    const { instance } = component()
    instance.syncSelected()
    instance.setData.mockClear()
    instance.syncSelected()
    expect(instance.setData).not.toHaveBeenCalled()
  })
})
