const assert = require("chai").assert

const lib = require("./testLib")
const mocking = require("./mocking")

const ipc = require("../app/lib/ipc/ipcShared")
const storage = require("../app/lib/main/storage")

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
        const ipc = require("../app/lib/ipc/ipcMain")
        const navigation = require("../app/lib/navigation/navigationMain")
        const settings = require("../app/lib/settings/settingsMain")

        beforeEach(() => {
            mocking.register.ipc.rendererOn(ipc.messages.resetContentBlocking)
            mocking.register.ipc.rendererOn(ipc.messages.fileOpen)
            mocking.register.ipc.rendererOn(ipc.messages.updateSettings, (_, options) => {
                assert.exists(options.lineBreaksEnabled)
                assert.exists(options.typographyEnabled)
                assert.exists(options.emojisEnabled)
                assert.exists(options.renderAsMarkdown)
                assert.exists(options.hideMetadata)
                assert.exists(options.dragDropBehavior)
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
        const ipc = require("../app/lib/ipc/ipcRenderer")
        const settings = require("../app/lib/settings/settingsRenderer")

        beforeEach(() => {
            ipc.init(mocking.electron)
            settings.init(mocking.document)
            settings.setFilePath(lib.DEFAULT_DOCUMENT_PATH)
            settings.setIsOpen(false)
        })

        afterEach(async () => {
            mocking.clear()
            await lib.removeDataDir()
        })

        it("can be opened", () => {
            mocking.register.ipc.mainOn(ipc.messages.settingsDialogIsOpen, (_, dialogIsOpen) =>
                assert.isTrue(dialogIsOpen),
            )

            const expectedApplicationSettings = storage.loadApplicationSettings().toJSON()
            const expectedDocumentSettings = storage
                .loadDocumentSettings(lib.DEFAULT_DOCUMENT_PATH)
                .toJSON()
            registerSettingsMessage(expectedApplicationSettings, expectedDocumentSettings)
            mocking.register.ipc.mainOn(ipc.messages.settingsDialogIsOpen, (_, dialogIsOpen) =>
                assert.isTrue(dialogIsOpen),
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
                assert.isFalse(dialogIsOpen),
            )
            settings.setIsOpen(true)
            settings.close()
            assert.isFalse(settings.isOpen())
        })
    })
})
