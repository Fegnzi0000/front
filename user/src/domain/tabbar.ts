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
    // 真机页面 show 生命周期可能早于自定义 TabBar 实例就绪；
    // TabBar 仅影响展示，不能阻断页面随后发起的数据请求。
    try {
      const page = Taro.getCurrentInstance()?.page as PageWithCustomTabBar | undefined
      page?.getTabBar?.()?.setData({ selected, hidden: false })
    } catch (error) {
      console.warn('[TabBar] 同步选中状态失败，本次跳过。', error)
    }
  }
  update()
  setTimeout(update, 0)
}

/** Slot 弹层显示时控制自定义 TabBar 可见性。 */
export function setCustomTabBarHidden(hidden: boolean) {
  try {
    const page = Taro.getCurrentInstance()?.page as PageWithCustomTabBar | undefined
    page?.getTabBar?.()?.setData({ hidden })
  } catch (error) {
    console.warn('[TabBar] 更新显示状态失败，本次跳过。', error)
  }
}
