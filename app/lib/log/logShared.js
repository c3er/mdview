let _isInitialized = false
let _isTest = false

const _debugMessages = []
const _infoMessages = []
const _errorMessages = []

function isString(value) {
    return typeof value === "string" || value instanceof String
}

function convertToString(args) {
    if (isString(args)) {
        return args
    }
    if (!(args instanceof Array)) {
        args = [args]
    }
    return args.map(arg => (isString(arg) ? arg : JSON.stringify(arg, null, 2))).join(" ")
}

function output(messages, outputFunc, args) {
    if (_isTest || !_isInitialized) {
        messages.push(args)
    } else {
        outputFunc(convertToString(args))
    }
}

exports.debugMessages = _debugMessages

exports.infoMessages = _infoMessages

exports.errorMessages = _errorMessages

exports.init = isTest => {
    _isTest = isTest
    _isInitialized = true
}

exports.output = output

exports.dumpPreInitMessages = (messages, outputFunc) => {
    const messagesToOutput = messages.slice()
    messages.length = 0
    for (const msg of messagesToOutput) {
        output(messages, outputFunc, msg)
    }
}

exports.clearMessages = () => {
    _debugMessages.length = 0
    _infoMessages.length = 0
    _errorMessages.length = 0
}
