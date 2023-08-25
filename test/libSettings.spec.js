const assert = require("chai").assert

const lib = require("./testLib")
const mocking = require("./mocking")

describe("Settings", () => {
    describe("Main part", () => {
        const ipc = require("../app/lib/ipc/ipcMain")
        const navigation = require("../app/lib/navigation/navigationMain")
        const storage = require("../app/lib/main/storage")
        const settings = require("../app/lib/settings/settingsMain")

        beforeEach(() => {
            mocking.register.ipc.rendererOn(ipc.messages.resetContentBlocking)
            mocking.register.ipc.rendererOn(ipc.messages.fileOpen)
            mocking.register.ipc.rendererOn(ipc.messages.changeRenderingOptions, (_, options) => {
                assert.exists(options.lineBreaksEnabled)
                assert.exists(options.typographyEnabled)
                assert.exists(options.emojisEnabled)
                assert.exists(options.renderAsMarkdown)
                assert.exists(options.hideMetadata)
            })

            ipc.init(mocking.mainWindow, mocking.electron)
            navigation.init(mocking.mainMenu)
            storage.init(mocking.dataDir, mocking.electron)
            settings.init(mocking.mainMenu, lib.DEFAULT_DOCUMENT_PATH)

            navigation.go(lib.DEFAULT_DOCUMENT_PATH)
        })

        afterEach(async () => {
            mocking.clear()
            await lib.removeDataDir()
        })

        it("opens", () => {
            mocking.register.ipc.rendererOn(
                ipc.messages.settings,
                (applicationSettings, documentSettings) => {
                    assert.exists(applicationSettings)
                    assert.exists(documentSettings)
                },
            )
            settings.open()
        })

        it("sets the zoom", () => {
            const expectedZoomFactor = 1.5
            mocking.register.ipc.rendererOn(ipc.messages.changeZoom, (_, zommFactor) =>
                assert.strictEqual(zommFactor, expectedZoomFactor),
            )
            settings.setZoom(expectedZoomFactor)
        })
    })
})
