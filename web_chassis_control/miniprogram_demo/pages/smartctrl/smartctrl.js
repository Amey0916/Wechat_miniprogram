const app = getApp()

Page({
  data: {
    theme: 'dark', fontSize: 'normal', t: {},
    navActive: false, followActive: false,
    unlocked: false, rvizVisible: false, fullscreen: false,
    rvizWebUrl: '',
  },

  _ioTimer: null,

  onLoad() { this._refresh() },
  onShow()  { this._refresh() },

  _refresh() {
    const { lang, fontSize } = app.globalData
    this.setData({
      theme: app.resolvedTheme(),
      fontSize,
      t: app.t(lang),
      rvizWebUrl: app.globalData.rvizWebUrl || ''
    })
  },

  onUnload() {
    if (this._ioTimer) { clearInterval(this._ioTimer); this._ioTimer = null }
  },

  goSettings() {
    app.globalData.prevPage = 'pages/smartctrl/smartctrl'
    wx.navigateTo({ url: '/pages/settings/settings' })
  },

  _sendWs(data) {
    return new Promise((resolve, reject) => {
      try {
        const s = wx.connectSocket({ url: app.globalData.serverWsUrl, timeout: 2000 })
        let done = false
        const finish = (ok, payload) => {
          if (done) return
          done = true
          try { s.close() } catch (_) {}
          ok ? resolve(payload) : reject(payload)
        }
        s.onOpen(() => {
          s.send({
            data: JSON.stringify(data),
            fail: (err) => finish(false, new Error(err?.errMsg || '发送失败'))
          })
        })
        s.onMessage((msg) => {
          try {
            const resp = JSON.parse(msg.data || '{}')
            if (resp.ok) finish(true, resp)
            else finish(false, new Error(resp.error || `后端执行失败: ${data.type || 'unknown'}`))
          } catch (_) {
            const raw = String(msg?.data || '').slice(0, 80)
            finish(false, new Error(`后端返回格式异常: ${raw}`))
          }
        })
        s.onError((err) => finish(false, new Error(err?.errMsg || `连接失败: ${app.globalData.serverWsUrl}`)))
      } catch (e) {
        reject(e)
      }
    })
  },

  async toggleNav() {
    const next = !this.data.navActive
    try {
      await this._sendWs({ type: 'launch', payload: { action: next ? 'start_nav' : 'stop_nav' } })
      this.setData({ navActive: next, rvizVisible: next })
      wx.showToast({ title: next ? '正在启动导航…' : '导航已关闭', icon: 'none' })
    } catch (e) {
      wx.showToast({ title: `导航操作失败：${e.message || '未知错误'}`, icon: 'none', duration: 2600 })
    }
  },

  async toggleFollow() {
    const next = !this.data.followActive
    if (next) {
      try {
        // 启动跟随功能（与后端 launch 映射一致）
        await this._sendWs({ type: 'launch', payload: { action: 'start_follow' } })
        this.setData({ followActive: true })
        wx.showToast({ title: '正在启动功能…', icon: 'none' })
      } catch (e) {
        this.setData({ followActive: false })
        wx.showToast({
          title: `开启失败：${e.message || '连接或执行失败'}`,
          icon: 'none',
          duration: 2800
        })
      }
    } else {
      try {
        await this._sendWs({ type: 'launch', payload: { action: 'stop_follow' } })
        this.setData({ followActive: false })
        wx.showToast({ title: '功能已关闭', icon: 'none' })
      } catch (e) {
        wx.showToast({ title: `关闭失败：${e.message || '未知错误'}`, icon: 'none', duration: 2600 })
      }
    }
  },

  goChassis() {
    app.globalData.prevPage = 'pages/smartctrl/smartctrl'
    wx.navigateTo({ url: '/pages/chassis/chassis' })
  },

  async toggleUnlock() {
    const next = !this.data.unlocked
    try {
      await this._sendWs({ type: 'io', payload: {
        io_cmd_enable: true, io_cmd_lamp_ctrl: true, io_cmd_unlock: next
      }})
      this.setData({ unlocked: next })
    } catch (e) {
      wx.showToast({ title: `解锁失败：${e.message || '未知错误'}`, icon: 'none', duration: 2600 })
      return
    }
    if (next) {
      if (!this._ioTimer) {
        this._ioTimer = setInterval(() => {
          this._sendWs({ type: 'io', payload: {
            io_cmd_enable: true, io_cmd_lamp_ctrl: true, io_cmd_unlock: true
          }}).catch(() => {})
        }, 100)
      }
      this._sendWs({ type: 'control', payload: { gear: 6, linear_x: 0, linear_y: 0, angular_z: 0 }}).catch(() => {})
    } else {
      if (this._ioTimer) { clearInterval(this._ioTimer); this._ioTimer = null }
      this._sendWs({ type: 'control', payload: { gear: 6, linear_x: 0, linear_y: 0, angular_z: 0 }}).catch(() => {})
    }
  },

  toggleFullscreen() {
    this.setData({ fullscreen: !this.data.fullscreen })
  }
})
