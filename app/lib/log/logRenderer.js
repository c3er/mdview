const ipc = require("../ipc/ipcRenderer")

const shared = require("./logShared")

exports.init = isTest => {
    shared.init(isTest)
    shared.clearMessages()
}

exports.debug = (...args) => {
    shared.output(shared.debugMessages, console.debug, args)
    ipc.send(ipc.messages.logToMainDebug, ...args)
}

exports.info = (...args) => {
    shared.output(shared.infoMessages, console.log, args)
    ipc.send(ipc.messages.logToMainInfo, ...args)
}

exports.error = (...args) => {
    shared.output(shared.errorMessages, console.error, args)
    ipc.send(ipc.messages.logToMainError, ...args)
}

// For testing

exports.debugMessages = shared.debugMessages

exports.infoMessages = shared.infoMessages

exports.errorMessages = shared.errorMessages
