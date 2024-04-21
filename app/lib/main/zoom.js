const settings = require("../settingsMain")
const storage = require("./storage")

const STEP = 0.1

let _applicationSettings

function set(factor) {
    settings.setZoom(factor)
}

exports.init = () => {
    _applicationSettings = storage.loadApplicationSettings()
    set(_applicationSettings.zoom)
}

exports.in = () => set(_applicationSettings.zoom + STEP)

exports.out = () => {
    const minFactor = 0.1
    let factor = _applicationSettings.zoom - STEP
    if (factor < minFactor) {
        factor = minFactor
    }
    set(factor)
}

exports.reset = () => set(_applicationSettings.ZOOM_DEFAULT)

exports.set = set
