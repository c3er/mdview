const assert = require("chai").assert

const mocking = require("./mocking")

describe("Logging", () => {
    const testMessage = "this is a test"

    describe("Main part", () => {
        const ipc = require("../app/lib/ipc/ipcMain")
        const log = require("../app/lib/log/logMain")

        function assertMessageFromrenderer(ipcMessage, messageArray) {
            mocking.register.ipc.mainOn(ipcMessage, (_, msg) => assert.equal(msg, testMessage))
            mocking.send.ipc.toMain(ipcMessage, null, testMessage)
            assert.deepInclude(messageArray, [testMessage])
        }

        beforeEach(() => {
            ipc.init(mocking.mainWindow, mocking.electron)
            log.init(true)
        })

        it("receives debug message from renderer process", () => {
            assertMessageFromrenderer(ipc.messages.logToMainDebug, log.debugMessages)
        })

        it("receives info message from renderer process", () => {
            assertMessageFromrenderer(ipc.messages.logToMainInfo, log.infoMessages)
        })

        it("receives error message from renderer process", () => {
            assertMessageFromrenderer(ipc.messages.logToMainError, log.errorMessages)
        })
    })

    describe("Renderer part", () => {
        const ipc = require("../app/lib/ipc/ipcRenderer")
        const log = require("../app/lib/log/logRenderer")

        function assertMessageToMain(ipcMessage, logFunc, messageArray) {
            mocking.register.ipc.mainOn(ipcMessage, (_, msg) => assert.equal(msg, testMessage))
            logFunc(testMessage)
            assert.deepInclude(messageArray, [testMessage])
        }

        beforeEach(() => log.init(true))

        it("sends debug message to main process", () => {
            assertMessageToMain(ipc.messages.logToMainDebug, log.debug, log.debugMessages)
        })

        it("sends info message to main process", () => {
            assertMessageToMain(ipc.messages.logToMainInfo, log.info, log.infoMessages)
        })

        it("sends error message to main process", () => {
            assertMessageToMain(ipc.messages.logToMainError, log.error, log.errorMessages)
        })
    })
})
