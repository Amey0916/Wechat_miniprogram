const app = getApp()

Page({
  data: {
    theme: 'dark',
    lang: 'zh-cn',
    fontSize: 'normal',
    t: {}  // 当前语言文本
  },

  onLoad() {
    this._refresh()
  },

  // settings 页面每次显示都刷新（从其他页面返回时也能更新）
  onShow() {
    this._refresh()
  },

  _refresh() {
    const { lang, fontSize } = app.globalData
    const resolvedTheme = app.resolvedTheme()
    this.setData({
      theme: resolvedTheme,
      lang,
      fontSize,
      t: app.t(lang)
    })
  },

  setTheme(e) {
    const theme = e.currentTarget.dataset.value
    app.setTheme(theme)
    // auto 主题实时解析后再设置 data.theme
    const resolved = theme === 'auto' ? app._autoTheme() : theme
    this.setData({ theme: resolved, 't.set_theme': app.t(this.data.lang).set_theme })
    // 重新刷新整个 t 和 theme
    this.setData({ theme: resolved, t: app.t(this.data.lang) })
  },

  setLang(e) {
    const lang = e.currentTarget.dataset.value
    app.setLang(lang)
    // 语言切换后立即更新本页所有文字
    this.setData({ lang, t: app.t(lang) })
  },

  setFontSize(e) {
    const fontSize = e.currentTarget.dataset.value
    app.setFontSize(fontSize)
    this.setData({ fontSize })
  },

  goBack() {
    wx.navigateBack()
  }
})
