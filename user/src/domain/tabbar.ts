import Taro from '@tarojs/taro'

interface NativeCustomTabBar {
  setData: (data: { selected?: number; hidden?: boolean }) => void
}

interface PageWithCustomTabBar {
  getTabBar?: () => NativeCustomTabBar | undefined
}

/** 主 Tab 页面显示时主动同步选中项，避免组件实例保留其他页面的旧状态。 */
export function syncCustomTabBar(selected: number) {
  const update = () => {
    const page = Taro.getCurrentInstance().page as PageWithCustomTabBar | undefined
    page?.getTabBar?.()?.setData({ selected, hidden: false })
  }
  update()
  setTimeout(update, 0)
}

/** Slot 弹层显示时控制自定义 TabBar 可见性。 */
export function setCustomTabBarHidden(hidden: boolean) {
  const page = Taro.getCurrentInstance().page as PageWithCustomTabBar | undefined
  page?.getTabBar?.()?.setData({ hidden })
}
