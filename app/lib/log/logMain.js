const ipc = require("../ipc/ipcMain")

const shared = require("./logShared")

let electron

function debug(...args) {
    shared.output(shared.debugMessages, console.debug, args)
}

function info(...args) {
    shared.output(shared.infoMessages, console.log, args)
}

function error(...args) {
    shared.output(shared.errorMessages, console.error, args)
}

exports.init = (isTest, electronMock) => {
    electron = electronMock ?? require("electron")
    shared.init(isTest)
    shared.clearMessages()

    electron.ipcMain.on(ipc.messages.logToMainDebug, (_, ...args) => debug(...args))
    electron.ipcMain.on(ipc.messages.logToMainInfo, (_, ...args) => info(...args))
    electron.ipcMain.on(ipc.messages.logToMainError, (_, ...args) => error(...args))
}

exports.debug = debug

exports.info = info

exports.error = error

// For testing

exports.debugMessages = shared.debugMessages

exports.infoMessages = shared.infoMessages

exports.errorMessages = shared.errorMessages
