const tabs = [
  { pagePath: '/pages/home/index', text: '首页', icon: 'home' },
  { pagePath: '/pages/foods/index', text: '食物池', icon: 'foods' },
  { pagePath: '/pages/slot/index', text: '开饭', icon: 'slot', center: true },
  { pagePath: '/pages/history/index', text: '记录', icon: 'record' },
  { pagePath: '/pages/profile/index', text: '我的', icon: 'profile' }
]

Component({
  data: {
    hidden: false,
    selected: 0,
    tabs
  },

  lifetimes: {
    attached() {
      this.syncSelected()
    }
  },

  pageLifetimes: {
    show() {
      this.syncSelected()
    }
  },

  methods: {
    syncSelected() {
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      const route = `/${currentPage && currentPage.route ? currentPage.route : ''}`.replace(/\/+$/, '')
      const selected = tabs.findIndex((tab) => tab.pagePath === route)
      // 没有匹配到主 Tab 时清空选中态，不能沿用默认“首页”。
      this.setData({ selected })
    },

    switchTab(event) {
      const selected = Number(event.currentTarget.dataset.index)
      wx.switchTab({
        url: tabs[selected].pagePath,
        success: () => this.syncSelected()
      })
    }
  }
})
