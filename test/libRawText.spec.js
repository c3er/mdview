const assert = require("assert")

const mocking = require("./mocking")

describe("Raw text", () => {
    describe("Main part", () => {
        const ipc = require("../app/lib/ipcMain")
        const rawText = require("../app/lib/rawTextMain")

        beforeEach(() => {
            ipc.init(mocking.mainWindow, mocking.electron)
            rawText.init(mocking.mainWindow, mocking.mainMenu, mocking.electron)
        })

        afterEach(() => mocking.clear())

        it("can be activated", () => {
            mocking.register.ipc.webContentsSend(ipc.messages.viewRawText)
            rawText.switchRawView()
        })

        it("can be deactivated", () => {
            let switchCount = 0
            mocking.register.ipc.webContentsSend(ipc.messages.viewRawText, () => {
                const expectedSwitchCount = 1
                switchCount++
                assert.strictEqual(
                    switchCount,
                    expectedSwitchCount,
                    `Raw view was switched ${switchCount} times.`,
                )
            })
            mocking.register.ipc.webContentsSend(ipc.messages.leaveRawText, () => {
                const expectedSwitchCount = 2
                switchCount++
                assert.strictEqual(
                    switchCount,
                    expectedSwitchCount,
                    `Raw view was switched ${switchCount} times.`,
                )
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
        const ipc = require("../app/lib/ipcRenderer")
        const rawText = require("../app/lib/rawTextRenderer")

        let reloaderIsCalled = false

        beforeEach(() => {
            ipc.init(mocking.electron)
            rawText.init(() => (reloaderIsCalled = true))
        })

        afterEach(() => {
            reloaderIsCalled = false
            mocking.clear()
        })

        it("can be activated", () => {
            mocking.send.ipc.toRenderer(ipc.messages.viewRawText)

            assert(reloaderIsCalled)
            assert(rawText.isInRawView())
        })

        it("can be deactivated", () => {
            mocking.send.ipc.toRenderer(ipc.messages.leaveRawText)

            assert(reloaderIsCalled)
            assert(!rawText.isInRawView())
        })
    })
})
