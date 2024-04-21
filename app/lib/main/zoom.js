const settings = require("../settingsMain")
const storage = require("./storage")

const STEP = 0.1
const MIN_FACTOR = 0.1

let _applicationSettings

function set(factor) {
    settings.setZoom(factor)
}

exports.STEP = STEP

exports.MIN_FACTOR = MIN_FACTOR

exports.init = () => {
    _applicationSettings = storage.loadApplicationSettings()
    set(_applicationSettings.zoom)
}

exports.in = () => set(_applicationSettings.zoom + STEP)

exports.out = () => {
    let factor = _applicationSettings.zoom - STEP
    if (factor < MIN_FACTOR) {
        factor = MIN_FACTOR
    }
    set(factor)
}

exports.reset = () => set(_applicationSettings.ZOOM_DEFAULT)

exports.set = set
