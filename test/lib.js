const path = require("path")

const chai = require("chai")
const chaiAsPromised = require("chai-as-promised")
const electron = require("electron")
const Application = require("spectron").Application

global.before(() => {
    chai.should()
    chai.use(chaiAsPromised)
})

exports.startApp = async documentPath => {
    const app = new Application({
        path: electron,
        args: [
            path.join(__dirname, ".."),
            documentPath,
        ],
    })
    chaiAsPromised.transferPromiseness = app.transferPromiseness
    return app.start()
}

exports.stopApp = async app => {
    if (app && app.isRunning()) {
        await app.stop()
    }
}
