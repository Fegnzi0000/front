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
    selected: -1,
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
      if (selected !== this.data.selected) this.setData({ selected })
    },

    switchTab(event) {
      const selected = Number(event.currentTarget.dataset.index)
      if (!Number.isInteger(selected) || !tabs[selected] || selected === this.data.selected || this.switching) return
      this.switching = true
      wx.switchTab({
        url: tabs[selected].pagePath,
        complete: () => { this.switching = false }
      })
    }
  }
})
