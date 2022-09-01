const path = require("path")

const log4js = require("log4js")

const ipc = require("../ipc/ipcMain")

const shared = require("./logShared")

let _logger

function debug(...args) {
    shared.output(shared.debugMessages, msg => _logger.debug(msg), args)
}

function info(...args) {
    shared.output(shared.infoMessages, msg => _logger.info(msg), args)
}

function error(...args) {
    shared.output(shared.errorMessages, msg => _logger.error(msg), args)
}

exports.init = (isTest, dataDir) => {
    shared.init(isTest)

    log4js.configure({
        appenders: {
            default: {
                type: "file",
                filename: path.join(dataDir, "app.log"),
                maxLogSize: "100K",
                layout: { type: "pattern", pattern: "[%d] [%p] %m" },
            },
        },
        categories: { default: { appenders: ["default"], level: "debug" } },
    })
    _logger = log4js.getLogger("default")

    ipc.listen(ipc.messages.logToMainDebug, (_, ...args) => debug(...args))
    ipc.listen(ipc.messages.logToMainInfo, (_, ...args) => info(...args))
    ipc.listen(ipc.messages.logToMainError, (_, ...args) => error(...args))

    shared.dumpPreInitMessages(shared.debugMessages, debug)
    shared.dumpPreInitMessages(shared.infoMessages, info)
    shared.dumpPreInitMessages(shared.errorMessages, error)
}

exports.SUBDIR = "log"

exports.debug = debug

exports.info = info

exports.error = error

// For testing

exports.debugMessages = shared.debugMessages

exports.infoMessages = shared.infoMessages

exports.errorMessages = shared.errorMessages
