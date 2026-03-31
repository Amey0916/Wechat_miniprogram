const app = getApp()

Page({
  data: {
    theme: 'dark', fontSize: 'normal', t: {},
    navActive: false, followActive: false,
    unlocked: false, rvizVisible: false, fullscreen: false,
  },

  _ioTimer: null,

  onLoad() { this._refresh() },
  onShow()  { this._refresh() },

  _refresh() {
    const { lang, fontSize } = app.globalData
    this.setData({ theme: app.resolvedTheme(), fontSize, t: app.t(lang) })
  },

  onUnload() {
    if (this._ioTimer) { clearInterval(this._ioTimer); this._ioTimer = null }
  },

  goSettings() {
    app.globalData.prevPage = 'pages/smartctrl/smartctrl'
    wx.navigateTo({ url: '/pages/settings/settings' })
  },

  _sendWs(data) {
    try {
      const s = wx.connectSocket({ url: app.globalData.serverWsUrl, timeout: 2000 })
      s.onOpen(() => { s.send({ data: JSON.stringify(data) }); s.close() })
    } catch(e) { console.warn(e) }
  },

  toggleNav() {
    const next = !this.data.navActive
    this.setData({ navActive: next, rvizVisible: next })
    this._sendWs({ type: 'launch', action: next ? 'start_nav' : 'stop_nav' })
    if (next) wx.showToast({ title: '正在启动导航…', icon: 'none' })
  },

  toggleFollow() {
    const next = !this.data.followActive
    this.setData({ followActive: next })
    if (next) {
      // 在新终端启动自定义功能节点
      this._sendWs({
        type: 'cmd',
        action: 'shell_new_term',
        command: 'source install/setup.bash && ros2 launch my_robot_apps open_function.launch.py'
      })
      wx.showToast({ title: '正在启动功能…', icon: 'none' })
    } else {
      // 停止功能：发送停止信号（如有对应 launch 可改为 stop_follow）
      this._sendWs({ type: 'launch', action: 'stop_follow' })
      wx.showToast({ title: '功能已关闭', icon: 'none' })
    }
  },

  goChassis() {
    app.globalData.prevPage = 'pages/smartctrl/smartctrl'
    wx.navigateTo({ url: '/pages/chassis/chassis' })
  },

  toggleUnlock() {
    const next = !this.data.unlocked
    this.setData({ unlocked: next })
    this._sendWs({ type: 'io', payload: {
      io_cmd_enable: true, io_cmd_lamp_ctrl: true, io_cmd_unlock: next
    }})
    if (next) {
      if (!this._ioTimer) {
        this._ioTimer = setInterval(() => {
          this._sendWs({ type: 'io', payload: {
            io_cmd_enable: true, io_cmd_lamp_ctrl: true, io_cmd_unlock: true
          }})
        }, 100)
      }
      this._sendWs({ type: 'control', payload: { gear: 6, linear_x: 0, linear_y: 0, angular_z: 0 }})
    } else {
      if (this._ioTimer) { clearInterval(this._ioTimer); this._ioTimer = null }
      this._sendWs({ type: 'control', payload: { gear: 6, linear_x: 0, linear_y: 0, angular_z: 0 }})
    }
  },

  toggleFullscreen() {
    this.setData({ fullscreen: !this.data.fullscreen })
  }
})
