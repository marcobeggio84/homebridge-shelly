module.exports = homebridge => {
  const { Ability } = require('./base')(homebridge)
  const { Characteristic, Service } = homebridge.hap

  class BatteryAbility extends Ability {

    constructor(
      levelProperty,
      chargeable = false,
      chargingProperty = null,
      externalPowerValue = null
    ) {
      super()

      this._levelProperty = levelProperty
      this._chargeable = chargeable
      this._chargingProperty = chargingProperty
      this._externalPowerValue = externalPowerValue

      // subtype fisso e stabile (obbligatorio HB 2.0)
      this._subtype = 'battery'
    }

    /**
     * Restituisce SEMPRE lo stesso servizio,
     * senza crearne duplicati
     */
    get service() {
      let service =
        this.platformAccessory.getService(Service.Battery) ||
        this.platformAccessory.getServiceById(Service.Battery, this._subtype)

      if (!service) {
        service = this._createService()
        this.platformAccessory.addService(service)
      }

      return service
    }

    get level() {
      const v = this.device[this._levelProperty]

      if (v === this._externalPowerValue) {
        return 100
      }

      return Math.min(Math.max(v, 0), 100)
    }

    get chargingState() {
      const CS = Characteristic.ChargingState

      if (!this._chargeable) {
        return CS.NOT_CHARGEABLE
      } else if (this.device[this._chargingProperty]) {
        return CS.CHARGING
      }
      return CS.NOT_CHARGING
    }

    get statusLow() {
      const SLB = Characteristic.StatusLowBattery
      return this.level < 10
        ? SLB.BATTERY_LEVEL_LOW
        : SLB.BATTERY_LEVEL_NORMAL
    }

    /**
     * Crea il servizio UNA SOLA VOLTA
     */
    _createService() {
      const service = new Service.Battery(this.name, this._subtype)

      service
        .setCharacteristic(Characteristic.BatteryLevel, this.level)
        .setCharacteristic(Characteristic.ChargingState, this.chargingState)
        .setCharacteristic(
          Characteristic.StatusLowBattery,
          this.statusLow
        )

      return service
    }

    _setupEventHandlers() {
      super._setupEventHandlers()

      this.device.on(
        'change:' + this._levelProperty,
        this._levelChangeHandler,
        this
      )

      if (this._chargeable && this._chargingProperty) {
        this.device.on(
          'change:' + this._chargingProperty,
          this._chargingChangeHandler,
          this
        )
      }
    }

    _levelChangeHandler(newValue) {
      this.log.debug(
        this._levelProperty,
        'of device',
        this.device.type,
        this.device.id,
        'changed to',
        newValue,
        '%'
      )

      this.service
        .setCharacteristic(Characteristic.BatteryLevel, this.level)
        .setCharacteristic(
          Characteristic.StatusLowBattery,
          this.statusLow
        )
    }

    _chargingChangeHandler(newValue) {
      this.log.debug(
        this._chargingProperty,
        'of device',
        this.device.type,
        this.device.id,
        'changed to',
        newValue
      )

      this.service.setCharacteristic(
        Characteristic.ChargingState,
        this.chargingState
      )
    }

    detach() {
      this.device.removeListener(
        'change:' + this._levelProperty,
        this._levelChangeHandler,
        this
      )

      if (this._chargingProperty) {
        this.device.removeListener(
          'change:' + this._chargingProperty,
          this._chargingChangeHandler,
          this
        )
      }

      super.detach()
    }
  }

  return BatteryAbility
}

