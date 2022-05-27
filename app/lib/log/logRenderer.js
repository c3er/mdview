const ipc = require("../ipc/ipcRenderer")

const shared = require("./logShared")

let electron

exports.init = (isTest, electronMock) => {
    electron = electronMock ?? require("electron")
    shared.init(isTest)
    shared.clearMessages()
}

exports.debug = (...args) => {
    shared.output(shared.debugMessages, console.debug, args)
    electron.ipcRenderer.send(ipc.messages.logToMainDebug, ...args)
}

exports.info = (...args) => {
    shared.output(shared.infoMessages, console.log, args)
    electron.ipcRenderer.send(ipc.messages.logToMainInfo, ...args)
}

exports.error = (...args) => {
    shared.output(shared.errorMessages, console.error, args)
    electron.ipcRenderer.send(ipc.messages.logToMainError, ...args)
}

// For testing

exports.debugMessages = shared.debugMessages

exports.infoMessages = shared.infoMessages

exports.errorMessages = shared.errorMessages
