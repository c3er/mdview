const assert = require("chai").assert

const mocking = require("./mocking")

describe("Raw text", () => {
    describe("Main part", () => {
        const ipc = require("../app/lib/ipc/ipcMain")
        const rawText = require("../app/lib/rawText/rawTextMain")

        beforeEach(() => rawText.init(mocking.mainWindow, mocking.mainMenu, mocking.electron))

        afterEach(() => mocking.clear())

        it("can be activated", () => {
            mocking.register.ipc.webContentsSend(ipc.messages.viewRawText)
            rawText.switchRawView()
        })

        it("can be deactivated", () => {
            let switchCount = 0
            mocking.register.ipc.webContentsSend(ipc.messages.viewRawText, () => {
                switchCount++
                assert.equal(switchCount, 1, `Raw view was switched ${switchCount} times.`)
            })
            mocking.register.ipc.webContentsSend(ipc.messages.leaveRawText, () => {
                switchCount++
                assert.equal(switchCount, 2, `Raw view was switched ${switchCount} times.`)
            })
            rawText.switchRawView()
            rawText.switchRawView()
        })

        it("can be disabled", () => {
            mocking.register.ipc.webContentsSend(ipc.messages.leaveRawText)
            mocking.register.ipc.mainOn(ipc.messages.disableRawView)
        })
    })

    describe("Renderer part", () => {
        const ipc = require("../app/lib/ipc/ipcRenderer")
        const rawText = require("../app/lib/rawText/rawTextRenderer")

        let statusBarUpdateCallback

        function registerStatusBarUpdate(callback) {
            statusBarUpdateCallback = callback
        }

        function updateStatusBar(text) {
            statusBarUpdateCallback(text)
        }

        beforeEach(() =>
            rawText.init(mocking.document, mocking.window, updateStatusBar, mocking.electron)
        )

        afterEach(() => mocking.clear())

        it("can be activated", () => {
            registerStatusBarUpdate(text => assert.isTrue(text.toLowerCase().includes("raw text")))
            mocking.send.ipc.toRenderer(ipc.messages.viewRawText)
        })

        it("can be deactivated", () => {
            registerStatusBarUpdate(text => assert.equal(text, ""))
            mocking.send.ipc.toRenderer(ipc.messages.leaveRawText)
        })
    })
})
