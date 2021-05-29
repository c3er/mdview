const path = require("path")

const chai = require("chai")
const chaiAsPromised = require("chai-as-promised")
const electron = require("electron")
const menuAddon = require("spectron-menu-addon-v2").default

// Based on https://stackoverflow.com/a/39914235/13949398 (What is the JavaScript version of sleep()?)
function sleep(ms) {
    // console.debug(`sleep ${ms} ${process.hrtime()}`) // For debugging
    return new Promise(resolve => setTimeout(resolve, ms))
}

global.before(() => chai.use(chaiAsPromised))

exports.startApp = async documentPath => {
    const app = menuAddon.createApplication({
        path: electron,
        args: [path.join(__dirname, ".."), documentPath, "--test"],
    })
    chaiAsPromised.transferPromiseness = app.transferPromiseness
    return app.start()
}

exports.stopApp = async app => {
    if (app && app.isRunning()) {
        await app.stop()
    }
}

exports.wait = async (predicate, tries, timeout) => {
    tries = tries || 10
    timeout = timeout || 100
    for (let i = 0; i < tries; i++) {
        if (await predicate()) {
            return true
        }
        await sleep(timeout)
    }
    return false
}
