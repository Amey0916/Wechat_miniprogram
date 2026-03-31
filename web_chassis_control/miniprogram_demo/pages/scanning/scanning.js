const app = getApp()

function send(socket, data) {
  return new Promise((resolve, reject) => {
    if (!socket || socket.readyState !== 1) {
      reject(new Error('WebSocket is not connected'))
      return
    }
    socket.send({ data: JSON.stringify(data), success: resolve, fail: reject })
  })
}

const COMMAND_INTERVAL_MS = 50
const DIFF_STEER = 20.0

Page({
  data: {
    theme: 'dark', fontSize: 'normal', t: {},
    fullscreen: false, unlocked: false,
    showSaveModal: false, speed: 0.4, speedPct: 40,
    rvizWebUrl: ''
  },

  onLoad() {
    this._refresh()
    this._activeDir = null
    this._ctrlTimer = null
    this.socket = wx.connectSocket({
      url: app.globalData.serverWsUrl,
      timeout: 2000
    })
    this.socket.onError((err) => { console.error('websocket error', err) })
  },

  onShow() {
    this._refresh()
    const unlocked = app.globalData.chassisUnlocked
    this.setData({ unlocked })
    if (unlocked) {
      this._ensureLoop()
    } else {
      this._stopAll()
    }
  },

  onUnload() {
    this._stopAll()
    if (this.socket) { this.socket.close(); this.socket = null }
  },

  _refresh() {
    const { lang, fontSize } = app.globalData
    this.setData({
      theme: app.resolvedTheme(),
      fontSize,
      t: app.t(lang),
      rvizWebUrl: app.globalData.rvizWebUrl || ''
    })
  },

  goSettings() {
    app.globalData.prevPage = 'pages/scanning/scanning'
    wx.navigateTo({ url: '/pages/settings/settings' })  
  },

  toggleFullscreen() {
    this.setData({ fullscreen: !this.data.fullscreen })
  },

  goChassis() {
    app.globalData.prevPage = 'pages/scanning/scanning'
    this._stopAll()
    wx.navigateTo({ url: '/pages/chassis/chassis' })
  },

  goBack() { wx.navigateBack() },

  goHome() {
    try { send(this.socket, { type: 'control', payload: { gear: 6, linear_x: 0, linear_y: 0, angular_z: 0 } }) } catch(e) {}
    const socket = wx.connectSocket({ url: app.globalData.serverWsUrl, timeout: 2000 })
    socket.onOpen(() => {
      socket.send({ data: JSON.stringify({ type: 'cmd', action: 'go_home' }) })
      socket.close()
    })
    wx.showToast({ title: '正在返回基站…', icon: 'none' })
  },

  showSaveModal() { this.setData({ showSaveModal: true }) },
  hideSaveModal() { this.setData({ showSaveModal: false }) },

  confirmSave() {
    this.setData({ showSaveModal: false })
    wx.showLoading({ title: '正在保存地图…' })
    const socket = wx.connectSocket({ url: app.globalData.serverWsUrl, timeout: 3000 })
    socket.onOpen(() => {
      socket.send({
        data: JSON.stringify({ type: 'cmd', action: 'shell', command: 'source install/setup.bash && cd ~/ros2_ws/src/yhs_nav2/map && ros2 run nav2_map_server map_server_cli -free 0.15 -occ 0.65 -f g1' }),
        success: () => {
          socket.close(); wx.hideLoading()
          const maps = wx.getStorageSync('maps') || []
          maps.push({ name: '新地图', thumb: '', id: Date.now() })
          wx.setStorageSync('maps', maps)
          app.globalData.newMapIdx = maps.length - 1
          wx.reLaunch({ url: '/pages/maplist/maplist' })
        },
        fail: () => { socket.close(); wx.hideLoading(); wx.showToast({ title: '保存失败', icon: 'none' }) }
      })
    })
    socket.onError(() => { wx.hideLoading(); wx.showToast({ title: '连接失败', icon: 'none' }) })
  },

  async sendControl(payload) {
    await send(this.socket, { type: 'control', payload })
  },

  async sendIo(payload) {
    await send(this.socket, { type: 'io', payload })
  },

  _buildIoPayload(unlocked) {
    return {
      io_cmd_enable:              true,
      io_cmd_lamp_ctrl:           true,
      io_cmd_unlock:              unlocked,
      io_cmd_lower_beam_headlamp: app.globalData.chassisLampOn || false,
      io_cmd_upper_beam_headlamp: false,
      io_cmd_turn_lamp:           0,
      io_cmd_braking_lamp:        false,
      io_cmd_clearance_lamp:      false,
      io_cmd_fog_lamp:            false,
      io_cmd_speaker:             0,
      io_cmd_wireless_charge:     0,
      io_cmd_dis_charge:          false
    }
  },

  _buildStopPayload() {
    return { gear: 6, linear_x: 0, linear_y: 0, angular_z: 0 }
  },

  _buildCtrlPayload(dir) {
    const vel = this.data.speed
    switch (dir) {
      case 'up':    return { gear: 6, linear_x:  vel, linear_y: 0, angular_z: 0 }
      case 'down':  return { gear: 6, linear_x: -vel, linear_y: 0, angular_z: 0 }
      case 'left':  return { gear: 6, linear_x: 0,    linear_y: 0, angular_z:  DIFF_STEER }
      case 'right': return { gear: 6, linear_x: 0,    linear_y: 0, angular_z: -DIFF_STEER }
      default:      return this._buildStopPayload()
    }
  },

  _ensureLoop() {
    if (this._ctrlTimer) return
    this._ctrlTimer = setInterval(() => { this._tick() }, COMMAND_INTERVAL_MS)
  },

  _stopLoop() {
    if (!this._ctrlTimer) return
    clearInterval(this._ctrlTimer); this._ctrlTimer = null
  },

  _stopAll() {
    this._stopLoop(); this._activeDir = null
  },

  // 每个 tick：只发运动指令，IO 解锁帧由 C++ io_keepalive_timer_（20ms）独立保活，
  // 两条路径完全解耦，避免序列号竞争导致底盘 MCU 触发安全复位（转向抖动/回正根因）
  async _tick() {
    if (!this.data.unlocked) { this._stopAll(); return }
    try {
      const payload = this._activeDir != null
        ? this._buildCtrlPayload(this._activeDir)
        : this._buildStopPayload()
      await this.sendControl(payload)
    } catch (err) { console.warn('send control failed', err) }
  },

  onDirTouchStart(e) {
    if (!this.data.unlocked) return
    this._activeDir = e.currentTarget.dataset.dir
    this._ensureLoop(); this._tick()
  },

  onDirTouchEnd() {
    this._activeDir = null
    if (this.data.unlocked) { this._ensureLoop(); this.sendControl(this._buildStopPayload()).catch(() => {}) }
    else { this._stopAll() }
  },

  onDirMouseDown(e) { this.onDirTouchStart(e) },
  onDirMouseUp()    { this.onDirTouchEnd() },
  onDirMouseLeave() { if (this._activeDir) this.onDirTouchEnd() },

  async toggleUnlock() {
    const next = !this.data.unlocked
    app.globalData.chassisUnlocked = next
    this.setData({ unlocked: next })
    this._activeDir = null

    if (next) {
      try { await this.sendIo(this._buildIoPayload(true)) } catch (e) { console.warn(e) }
      try { await this.sendControl(this._buildStopPayload()) } catch (e) { console.warn(e) }
      this._ensureLoop()
    } else {
      this._stopAll()
      try { await this.sendIo(this._buildIoPayload(false)) } catch (e) { console.warn(e) }
    }
  },

  onSpeedChange(e) {
    const pct = e.detail.value
    const speed = +(0.1 + 0.9 * pct / 100).toFixed(2)
    this.setData({ speedPct: pct, speed })
  }
})
