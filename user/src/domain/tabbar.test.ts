import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Taro from '@tarojs/taro'
import { setCustomTabBarHidden, syncCustomTabBar } from './tabbar'

vi.mock('@tarojs/taro', () => ({ default: { getCurrentInstance: vi.fn() } }))

function createPage() {
  const data = { selected: -1, hidden: false }
  const bar = { setData: (patch: Partial<typeof data>) => Object.assign(data, patch) }
  return { data, page: { getTabBar: () => bar } }
}

describe('custom tab bar lifecycle', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('keeps an open sheet hidden when the page shows again', () => {
    const { page, data } = createPage()
    vi.mocked(Taro.getCurrentInstance).mockReturnValue({ page } as never)
    syncCustomTabBar(2, true)
    vi.runAllTimers()
    expect(data).toEqual({ selected: 2, hidden: true })
  })

  it('does not let a delayed show overwrite a newer hide', () => {
    const { page, data } = createPage()
    vi.mocked(Taro.getCurrentInstance).mockReturnValue({ page } as never)
    syncCustomTabBar(2)
    setCustomTabBarHidden(true)
    vi.runAllTimers()
    expect(data).toEqual({ selected: 2, hidden: true })
  })

  it('does not apply a previous page retry to another tab', () => {
    const first = createPage()
    const second = createPage()
    vi.mocked(Taro.getCurrentInstance).mockReturnValue({ page: first.page } as never)
    syncCustomTabBar(2)
    vi.mocked(Taro.getCurrentInstance).mockReturnValue({ page: second.page } as never)
    vi.runAllTimers()
    expect(first.data.selected).toBe(2)
    expect(second.data.selected).toBe(-1)
  })

  it('retries when the native component becomes ready later', () => {
    const { page, data } = createPage()
    const getTabBar = vi.fn().mockReturnValueOnce(undefined).mockImplementation(page.getTabBar)
    vi.mocked(Taro.getCurrentInstance).mockReturnValue({ page: { getTabBar } } as never)
    syncCustomTabBar(2, true)
    vi.runAllTimers()
    expect(data).toEqual({ selected: 2, hidden: true })
  })

  it('restores normal tabs and tolerates a missing page', () => {
    const { page, data } = createPage()
    data.hidden = true
    vi.mocked(Taro.getCurrentInstance).mockReturnValue({ page } as never)
    syncCustomTabBar(0)
    vi.runAllTimers()
    expect(data).toEqual({ selected: 0, hidden: false })
    vi.mocked(Taro.getCurrentInstance).mockReturnValue({} as never)
    expect(() => { syncCustomTabBar(0); setCustomTabBarHidden(false); vi.runAllTimers() }).not.toThrow()
  })

  it('never asks the native tab bar to show alongside the custom component', () => {
    const source = readFileSync('src/pages/slot/index.tsx', 'utf8')
    expect(source).not.toMatch(/Taro\.(showTabBar|hideTabBar)\s*\(/)
  })
})
