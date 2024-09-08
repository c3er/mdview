const ipc = require("./ipcMain")
const settings = require("./settingsMain")
const storage = require("./storageMain")

const STEP = 0.1
const MIN_FACTOR = 0.1

let _applicationSettings

function set(factor) {
    settings.setZoom(factor)
}

function zoomIn() {
    set(_applicationSettings.zoom + STEP)
}

function zoomOut() {
    let factor = _applicationSettings.zoom - STEP
    if (factor < MIN_FACTOR) {
        factor = MIN_FACTOR
    }
    set(factor)
}

exports.STEP = STEP

exports.MIN_FACTOR = MIN_FACTOR

exports.init = () => {
    _applicationSettings = storage.loadApplicationSettings()
    set(_applicationSettings.zoom)

    ipc.listen(ipc.messages.zoomIn, zoomIn)
    ipc.listen(ipc.messages.zoomOut, zoomOut)
}

exports.in = zoomIn

exports.out = zoomOut

exports.reset = () => set(_applicationSettings.ZOOM_DEFAULT)

exports.set = set
