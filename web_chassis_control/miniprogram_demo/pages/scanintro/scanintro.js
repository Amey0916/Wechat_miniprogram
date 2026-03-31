const app = getApp()

Page({
  data: { theme: 'dark', fontSize: 'normal', t: {} },

  onLoad() { this._refresh() },
  onShow()  { this._refresh() },

  _refresh() {
    const { lang, fontSize } = app.globalData
    const t = app.t(lang)
    this.setData({
      theme: app.resolvedTheme(), fontSize, t,
      instructions: t.intro_steps.map((text, i) => ({ no: String(i + 1), text }))
    })
  },

  goSettings() {
    app.globalData.prevPage = 'pages/scanintro/scanintro'
    wx.navigateTo({ url: '/pages/settings/settings' })
  },

  onStart() {
    wx.showLoading({ title: '正在启动 RViz2…' })
    const socket = wx.connectSocket({ url: app.globalData.serverWsUrl, timeout: 3000 })
    socket.onOpen(() => {
      socket.send({
        data: JSON.stringify({ type: 'cmd', action: 'shell_new_term', command: 'rviz2' }),
        success: () => { socket.close(); wx.hideLoading(); wx.navigateTo({ url: '/pages/scanning/scanning' }) },
        fail:    () => { socket.close(); wx.hideLoading(); wx.showToast({ title: '启动失败', icon: 'none' }) }
      })
    })
    socket.onError(() => { wx.hideLoading(); wx.showToast({ title: '连接失败', icon: 'none' }) })
  }
})
