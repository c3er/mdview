const shared = require("./ipcShared")

let electron

const _preInitIpcListeners = []

function listen(message, callback) {
    if (electron) {
        electron.ipcRenderer.on(message, (_, ...args) => callback(...args))
    } else {
        _preInitIpcListeners.push({
            message: message,
            callback: callback,
        })
    }
}

exports.messages = shared.messages

exports.init = electronMock => {
    electron = electronMock ?? require("electron")

    if (_preInitIpcListeners.length > 0) {
        _preInitIpcListeners.forEach(listener => listen(listener.message, listener.callback))
        _preInitIpcListeners.length = 0
    }
}

exports.listen = listen

exports.send = (message, ...args) => electron.ipcRenderer.send(message, ...args)
