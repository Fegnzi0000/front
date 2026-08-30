export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/auth/login/index',
    'pages/auth/register/index',
    'pages/onboarding/index',
    'pages/home/index',
    'pages/foods/index',
    'pages/slot/index',
    'pages/history/index',
    'pages/profile/index',
    'pages/diet/edit/index',
    'pages/foods/edit/index',
    'pages/tags/index',
    'pages/budget/index',
    'pages/preferences/index',
    'pages/profile/edit/index',
    'pages/account/security/index',
    'pages/settings/index',
    'pages/ai/preview/index',
  ],
  window: {
    backgroundTextStyle: 'dark',
    backgroundColor: '#FFF8F6',
    navigationBarBackgroundColor: '#FFF8F6',
    navigationBarTitleText: '是啊，吃什么？',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    custom: true,
    color: '#7A665C',
    selectedColor: '#9B4500',
    backgroundColor: '#FFF1ED',
    borderStyle: 'white',
    list: [
      { pagePath: 'pages/home/index', text: '首页' },
      { pagePath: 'pages/foods/index', text: '食物池' },
      { pagePath: 'pages/slot/index', text: '开饭' },
      { pagePath: 'pages/history/index', text: '记录' },
      { pagePath: 'pages/profile/index', text: '我的' }
    ]
  }
})
