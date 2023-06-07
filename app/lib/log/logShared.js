let _isInitialized = false
let _isTest = false

const _debugMessages = []
const _infoMessages = []
const _errorMessages = []

function output(storedMessages, outputFunc, args) {
    if (_isTest || !_isInitialized) {
        storedMessages.push(args)
    } else {
        outputFunc(...args)
    }
}

function dumpPreInitMessages(storedMessages, outputFunc) {
    const messagesToOutput = storedMessages.slice()
    storedMessages.length = 0
    for (const msg of messagesToOutput) {
        output(storedMessages, outputFunc, msg)
    }
}

exports.init = isTest => {
    _isTest = isTest
    _isInitialized = true

    dumpPreInitMessages(_debugMessages, console.debug)
    dumpPreInitMessages(_infoMessages, console.log)
    dumpPreInitMessages(_errorMessages, console.error)
}

exports.output = output

exports.clearMessages = () => {
    _debugMessages.length = 0
    _infoMessages.length = 0
    _errorMessages.length = 0
}

exports.debugMessages = _debugMessages

exports.infoMessages = _infoMessages

exports.errorMessages = _errorMessages
