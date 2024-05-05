const shared = require("./ipcShared")

let electron
let _mainWindow

const _preInitIpcListeners = []

function listen(message, callback) {
    if (electron) {
        electron.ipcMain.on(message, (_, ...args) => callback(...args))
    } else {
        _preInitIpcListeners.push({
            message: message,
            callback: callback,
        })
    }
}

exports.messages = shared.messages

exports.init = (mainWindow, electronMock) => {
    _mainWindow = mainWindow
    electron = electronMock ?? require("electron")

    for (const listener of _preInitIpcListeners) {
        listen(listener.message, listener.callback)
    }
    _preInitIpcListeners.length = 0
}

exports.reset = mainWindow => (_mainWindow = mainWindow)

exports.listen = listen

exports.send = (message, ...args) => _mainWindow.webContents.send(message, ...args)
