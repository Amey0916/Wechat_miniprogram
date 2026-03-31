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
const MAX_VEL    = 1.0
const MIN_VEL    = 0.1

Page({
  data: {
    theme:    'dark',
    fontSize: 'normal',
    t:        {},
    lampOn:   false,
    unlocked: false,
    speed:    0.3,
    speedPct: 75
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
    const lampOn   = app.globalData.chassisLampOn
    this.setData({ unlocked, lampOn })
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
    this.setData({ theme: app.resolvedTheme(), fontSize, t: app.t(lang) })
  },

  goSettings() {
    app.globalData.prevPage = 'pages/chassis/chassis'
    wx.navigateTo({ url: '/pages/settings/settings' })
  },

  goBack() { wx.navigateBack() },

  async sendControl(payload) {
    await send(this.socket, { type: 'control', payload })
  },

  async sendIo(payload) {
    await send(this.socket, { type: 'io', payload })
  },

  _buildIoPayload() {
    return {
      io_cmd_enable:              true,
      io_cmd_lamp_ctrl:           true,
      io_cmd_unlock:              this.data.unlocked,
      io_cmd_lower_beam_headlamp: this.data.lampOn,
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
    return { gear: 6, linear_x: 0.0, linear_y: 0.0, angular_z: 0.0 }
  },

  _buildCtrlPayload(dir) {
    const vel = this.data.speed
    switch (dir) {
      case 'up':    return { gear: 6, linear_x:  vel, linear_y: 0.0, angular_z: 0.0 }
      case 'down':  return { gear: 6, linear_x: -vel, linear_y: 0.0, angular_z: 0.0 }
      case 'left':  return { gear: 6, linear_x: 0.0,  linear_y: 0.0, angular_z:  DIFF_STEER }
      case 'right': return { gear: 6, linear_x: 0.0,  linear_y: 0.0, angular_z: -DIFF_STEER }
      default:      return this._buildStopPayload()
    }
  },

  _ensureLoop() {
    if (this._ctrlTimer) return
    this._ctrlTimer = setInterval(() => { this._tick() }, COMMAND_INTERVAL_MS)
  },

  _stopLoop() {
    if (!this._ctrlTimer) return
    clearInterval(this._ctrlTimer)
    this._ctrlTimer = null
  },

  _stopAll() {
    this._stopLoop()
    this._activeDir = null
  },

  // 每个 tick：先发 IO unlock 帧（防超时回锁），再发运动指令，与遥控器行为一致
  async _tick() {
    if (!this.data.unlocked) { this._stopAll(); return }
    try { await this.sendIo(this._buildIoPayload()) } catch (e) {}
    try {
      const payload = this._activeDir != null
        ? this._buildCtrlPayload(this._activeDir)
        : this._buildStopPayload()
      await this.sendControl(payload)
    } catch (err) { console.warn('send control failed', err) }
  },

  onSpeedChange(e) {
    const pct = e.detail.value
    const speed = +(MIN_VEL + (MAX_VEL - MIN_VEL) * pct / 100).toFixed(2)
    this.setData({ speedPct: pct, speed })
  },

  async onDirTouchStart(e) {
    if (!this.data.unlocked) return
    this._activeDir = e.currentTarget.dataset.dir
    this._ensureLoop()
    await this._tick()
  },

  async onDirTouchEnd() {
    this._activeDir = null
    if (this.data.unlocked) {
      this._ensureLoop()
      try { await this.sendControl(this._buildStopPayload()) } catch (e) { console.warn(e) }
    } else {
      this._stopAll()
    }
  },

  async onDirMouseDown(e) {
    if (!this.data.unlocked) return
    this._activeDir = e.currentTarget.dataset.dir
    this._ensureLoop()
    await this._tick()
  },

  async onDirMouseUp()    { await this.onDirTouchEnd() },
  async onDirMouseLeave() { if (this._activeDir != null) await this.onDirTouchEnd() },

  async onDirTap(e) {
    if (!this.data.unlocked) return
    this._activeDir = e.currentTarget.dataset.dir
    this._ensureLoop()
    await this._tick()
    await new Promise(r => setTimeout(r, 150))
    await this.onDirTouchEnd()
  },

  async toggleUnlock() {
    const next = !this.data.unlocked
    app.globalData.chassisUnlocked = next
    app.globalData.chassisLampOn   = this.data.lampOn
    this.setData({ unlocked: next })
    this._activeDir = null

    if (next) {
      try { await this.sendIo(this._buildIoPayload()) } catch (e) { console.warn(e) }
      try { await this.sendControl(this._buildStopPayload()) } catch (e) { console.warn(e) }
      this._ensureLoop()
    } else {
      this._stopAll()
      try { await this.sendIo(this._buildIoPayload()) } catch (e) { console.warn(e) }
    }
  },

  async lamp() {
    const next = !this.data.lampOn
    app.globalData.chassisLampOn = next
    this.setData({ lampOn: next })
    try { await this.sendIo(this._buildIoPayload()) } catch (e) { console.warn(e) }
  }
})
