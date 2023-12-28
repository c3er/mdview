const ipc = require("./ipcMain")

const shared = require("./logShared")

function debug(...args) {
    shared.output(shared.debugMessages, console.debug, args)
}

function info(...args) {
    shared.output(shared.infoMessages, console.log, args)
}

function error(...args) {
    shared.output(shared.errorMessages, console.error, args)
}

exports.init = isTest => {
    shared.init(isTest)
    shared.clearMessages()

    ipc.listen(ipc.messages.logToMainDebug, debug)
    ipc.listen(ipc.messages.logToMainInfo, info)
    ipc.listen(ipc.messages.logToMainError, error)
}

exports.debug = debug

exports.info = info

exports.error = error

// For testing

exports.debugMessages = shared.debugMessages

exports.infoMessages = shared.infoMessages

exports.errorMessages = shared.errorMessages

exports.reset = shared.clearMessages
