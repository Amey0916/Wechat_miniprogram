const app = getApp()

Page({
  data: {
    theme: 'dark',
    fontSize: 'normal',
    t: {},
    launching: false,
    launched: false,
  },

  onLoad() { this._refresh() },
  onShow()  { this._refresh() },

  _refresh() {
    const { lang, fontSize } = app.globalData
    this.setData({
      theme: app.resolvedTheme(),
      fontSize,
      t: app.t(lang)
    })
  },

  goSettings() {
    app.globalData.prevPage = 'pages/home/home'
    wx.navigateTo({ url: '/pages/settings/settings' })
  },

  // 点击「开启智慧生活」
  // 1. 连接 WebSocket（工控机开机已自动启动）
  // 2. 连通后发送 {type:'launch', action:'start_chassis'} 启动 yhs_can_control
  // 3. 跳转到地图选择界面
  onLaunch() {
    if (this.data.launching) return
    this.setData({ launching: true })
    wx.showLoading({ title: '正在连接机器人…', mask: true })
    this._tryConnect(0)
  },

  _tryConnect(attempt) {
    const MAX_ATTEMPTS = 8
    const RETRY_MS = 1500

    const socket = wx.connectSocket({
      url: app.globalData.serverWsUrl,
      timeout: 2000
    })

    let handled = false

    const _fail = () => {
      if (handled) return
      handled = true
      socket.close()
      if (attempt < MAX_ATTEMPTS - 1) {
        setTimeout(() => this._tryConnect(attempt + 1), RETRY_MS)
      } else {
        wx.hideLoading()
        this.setData({ launching: false })
        wx.showModal({
          title: '无法连接到机器人',
          content: '请确认工控机已上电并运行：\nros2 launch web_chassis_control websocket_only.launch.py',
          confirmText: '重试',
          cancelText: '取消',
          success: (res) => { if (res.confirm) this.onLaunch() }
        })
      }
    }

    socket.onOpen(() => {
      if (handled) return
      // WebSocket 已连通，发送启动底盘节点指令
      socket.send({
        data: JSON.stringify({ type: 'launch', payload: { action: 'start_chassis' } }),
        success: () => {
          handled = true
          socket.close()
          wx.hideLoading()
          this.setData({ launching: false, launched: true })
          app.globalData.chassisLaunched = true
          wx.navigateTo({ url: '/pages/maplist/maplist' })
        },
        fail: () => {
          handled = true
          socket.close()
          wx.hideLoading()
          this.setData({ launching: false })
          wx.showToast({ title: '指令发送失败', icon: 'none' })
        }
      })
    })

    socket.onError(() => _fail())
    socket.onClose(() => { if (!handled) _fail() })
  }
})
