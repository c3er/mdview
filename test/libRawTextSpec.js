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
                const expectedSwitchCount = 1
                switchCount++
                assert.equal(
                    switchCount,
                    expectedSwitchCount,
                    `Raw view was switched ${switchCount} times.`,
                )
            })
            mocking.register.ipc.webContentsSend(ipc.messages.leaveRawText, () => {
                const expectedSwitchCount = 2
                switchCount++
                assert.equal(
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
        const ipc = require("../app/lib/ipc/ipcRenderer")
        const rawText = require("../app/lib/rawText/rawTextRenderer")

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

            assert.isTrue(reloaderIsCalled)
            assert.isTrue(rawText.isInRawView())
        })

        it("can be deactivated", () => {
            mocking.send.ipc.toRenderer(ipc.messages.leaveRawText)

            assert.isTrue(reloaderIsCalled)
            assert.isFalse(rawText.isInRawView())
        })
    })
})
