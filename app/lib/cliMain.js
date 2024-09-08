const path = require("path")

const log = require("./log")

let electron

const DEFAULT_FILE = path.join(__dirname, "..", "..", "README.md")

function extractInternalTarget(args) {
    return args.find(arg => arg.startsWith("#"))
}

function extractFilePath(args, storageDirArgIndex) {
    return (
        args.find(
            arg =>
                arg !== process.execPath &&
                arg !== "." &&
                arg !== electron.app.getAppPath() &&
                arg !== "data:," &&
                !arg.startsWith("-") &&
                !arg.startsWith("#") &&
                args.indexOf(arg) !== storageDirArgIndex,
        ) ?? DEFAULT_FILE
    )
}

function isDevelopment() {
    return Boolean(process.defaultApp)
}

function parseTestArgs(args) {
    const testArgIndex = args.indexOf("--test")
    const isTest = testArgIndex >= 0

    let storageDirArgIndex = -1
    if (isTest && testArgIndex < args.length - 1) {
        storageDirArgIndex = testArgIndex + 1
    }
    const storageDir = isDevelopment()
        ? path.join(__dirname, "..", "..", "..", ".storage")
        : path.join(electron.app.getPath("userData"), "storage")

    return {
        isTest: isTest,
        storageDir: storageDirArgIndex >= 0 ? args[storageDirArgIndex] : storageDir,
        storageDirArgIndex: storageDirArgIndex,
    }
}

exports.init = electronMock => (electron = electronMock ?? require("electron"))

exports.parse = args => {
    log.debug(args)
    const { isTest, storageDir, storageDirArgIndex } = parseTestArgs(args)
    const parsedArgs = {
        filePath: extractFilePath(args, storageDirArgIndex),
        internalTarget: extractInternalTarget(args),
        isTest: isTest,
        storageDir: storageDir,
    }
    log.debug(parsedArgs)
    return parsedArgs
}

exports.isDevelopment = isDevelopment

exports.shallOutputAppPath = args => args.includes("--app-path")

exports.shallOutputDataPath = args => args.includes("--data-path")
