const assert = require("assert")

const lib = require("./testLib")
const mocking = require("./mocking")

const ipc = require("../app/lib/ipcShared")
const storage = require("../app/lib/storageMain")

function registerSettingsMessage(expectedApplicationSettings, expectedDocumentSettings) {
    mocking.register.ipc.rendererOn(
        ipc.messages.settings,
        (_, applicationSettings, documentSettings) => {
            assert.deepEqual(applicationSettings, expectedApplicationSettings)
            assert.deepEqual(documentSettings, expectedDocumentSettings)
        },
    )
}

describe("Settings", () => {
    describe("Main part", () => {
        const ipc = require("../app/lib/ipcMain")
        const navigation = require("../app/lib/navigationMain")
        const settings = require("../app/lib/settingsMain")

        beforeEach(() => {
            mocking.register.ipc.rendererOn(ipc.messages.resetContentBlocking)
            mocking.register.ipc.rendererOn(ipc.messages.fileOpen)
            mocking.register.ipc.rendererOn(ipc.messages.currentFilePath)
            mocking.register.ipc.rendererOn(ipc.messages.updateSettings, (_, options) => {
                assert(options.lineBreaksEnabled !== undefined)
                assert(options.typographyEnabled !== undefined)
                assert(options.emojisEnabled !== undefined)
                assert(options.renderAsMarkdown !== undefined)
                assert(options.hideMetadata !== undefined)
                assert(options.dragDropBehavior !== undefined)
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
            registerSettingsMessage(
                storage.loadApplicationSettings().toJSON(),
                storage.loadDocumentSettings(lib.DEFAULT_DOCUMENT_PATH).toJSON(),
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

    describe("Renderer part", () => {
        const dialog = require("../app/lib/dialogRenderer")
        const ipc = require("../app/lib/ipcRenderer")
        const renderer = require("../app/lib/commonRenderer")
        const settings = require("../app/lib/settingsRenderer")

        beforeEach(() => {
            dialog.reset()
            ipc.init(mocking.electron)
            renderer.init(mocking.document, mocking.window)
            settings.init(mocking.document, mocking.window)
            settings.setFilePath(lib.DEFAULT_DOCUMENT_PATH)
        })

        afterEach(async () => {
            mocking.clear()
            await lib.removeDataDir()
        })

        it("can be opened", () => {
            mocking.register.ipc.mainOn(ipc.messages.settingsDialogIsOpen, (_, dialogIsOpen) =>
                assert(dialogIsOpen),
            )

            const expectedApplicationSettings = storage.loadApplicationSettings().toJSON()
            const expectedDocumentSettings = storage
                .loadDocumentSettings(lib.DEFAULT_DOCUMENT_PATH)
                .toJSON()
            registerSettingsMessage(expectedApplicationSettings, expectedDocumentSettings)
            mocking.register.ipc.mainOn(ipc.messages.settingsDialogIsOpen, (_, dialogIsOpen) =>
                assert(dialogIsOpen),
            )
            mocking.send.ipc.toRenderer(
                ipc.messages.settings,
                {},
                expectedApplicationSettings,
                expectedDocumentSettings,
            )
        })

        it("closes", () => {
            mocking.register.ipc.mainOn(ipc.messages.settingsDialogIsOpen, (_, dialogIsOpen) =>
                assert(!dialogIsOpen),
            )

            settings.open()
            assert(dialog.isOpen())
            assert.strictEqual(dialog.current().id, settings.DIALOG_ID)

            dialog.close()
            assert(!dialog.isOpen())
            assert(dialog.current() === null)
        })
    })
})
