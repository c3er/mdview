const path = require("path")

const yargs = require("yargs/yargs")
const yargsHelpers = require("yargs/helpers")

const log = require("../log/log")

let electron

const DEFAULT_FILE = path.join(__dirname, "..", "..", "..", "README.md")

exports.init = electronMock => (electron = electronMock ?? require("electron"))

exports.parse = args => {
    log.debug("Raw arguments:", args)

    const argv = yargs(yargsHelpers.hideBin(args))
        .option("internal-target", {
            describe: "Target to scroll to inside the document",
            type: "string",
            default: "",
        })
        .option("test", {
            describe: "Flag for application's test mode",
            type: "boolean",
            default: false,
        })
        .option("storage-dir", {
            describe: "Override application's default directory for storing settings",
            type: "string",
            default: path.join(electron.app.getPath("userData"), "storage"),
        })
        .option("get-user-data-path", {
            describe: "Output the user data path and exit",
            type: "boolean",
            default: false,
        }).argv
    log.debug("Parsed by Yargs:", argv)

    // Assume that the last argument is the file to open. If the application is
    // invoked by Playwright, the Yargs hideBin function fails.
    // See issues:
    // https://github.com/yargs/yargs/issues/2225
    // https://github.com/microsoft/playwright/issues/16614
    const positionalArgs = argv._
    const parsed = {
        filePath: positionalArgs[positionalArgs.length - 1] ?? DEFAULT_FILE,
        internalTarget: argv.internalTarget,
        isTest: argv.test,
        storageDir: argv.storageDir,
        shallOutputUserDataPath: argv.getUserDataPath,
    }
    log.debug("Parsed arguments:", parsed)

    return parsed
}
