import Taro from '@tarojs/taro'

interface NativeCustomTabBar {
  setData: (data: { selected?: number; hidden?: boolean }) => void
}

interface PageWithCustomTabBar {
  getTabBar?: () => NativeCustomTabBar | undefined
}

type TabBarState = { selected?: number; hidden?: boolean }
const pageStates = new WeakMap<PageWithCustomTabBar, TabBarState>()

function updateCustomTabBar(patch: TabBarState) {
  try {
    const page = Taro.getCurrentInstance()?.page as PageWithCustomTabBar | undefined
    if (!page) return
    pageStates.set(page, { ...pageStates.get(page), ...patch })
    const update = () => {
      try {
        // 固定所属页面，并读取最新状态，避免延迟回调覆盖弹层状态或影响其他 Tab。
        page.getTabBar?.()?.setData(pageStates.get(page) ?? {})
      } catch (error) {
        console.warn('[TabBar] 更新显示状态失败，本次跳过。', error)
      }
    }
    update()
    // 真机 show 可能早于自定义组件就绪。
    setTimeout(update, 0)
  } catch (error) {
    console.warn('[TabBar] 更新显示状态失败，本次跳过。', error)
  }
}

/** 主 Tab 页面显示时同步选中项及该页面当前需要的可见性。 */
export function syncCustomTabBar(selected: number, hidden = false) {
  updateCustomTabBar({ selected, hidden })
}

/** Slot 弹层显示时控制自定义 TabBar 可见性。 */
export function setCustomTabBarHidden(hidden: boolean) {
  updateCustomTabBar({ hidden })
}
