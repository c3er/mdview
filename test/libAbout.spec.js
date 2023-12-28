const assert = require("chai").assert

const mocking = require("./mocking")

describe("About dialog", () => {
    describe("Main part", () => {
        const about = require("../app/lib/aboutMain")
        const ipc = require("../app/lib/ipcMain")

        beforeEach(() => {
            ipc.init(mocking.mainWindow, mocking.electron)
            about.init(mocking.mainMenu)
        })

        afterEach(mocking.clear)

        it("opens", () => {
            mocking.register.ipc.rendererOn(ipc.messages.about, (_, aboutInfo) => {
                assert.exists(aboutInfo.applicationIconPath)
                assert.exists(aboutInfo.applicationName)
                assert.exists(aboutInfo.applicationDescription)
                assert.exists(aboutInfo.applicationVersion)
                assert.exists(aboutInfo.homepage)
                assert.exists(aboutInfo.issueLink)
                assert.exists(aboutInfo.frameworkVersions)
            })
            about.open()
        })
    })

    describe("Renderer part", () => {
        const about = require("../app/lib/aboutRenderer")
        const dialog = require("../app/lib/renderer/dialog")
        const ipc = require("../app/lib/ipcRenderer")

        beforeEach(() => {
            dialog.reset()

            ipc.init(mocking.electron)
            about.init(mocking.document, mocking.electron)
        })

        afterEach(mocking.clear)

        it("can be opened", () => {
            mocking.register.ipc.mainOn(ipc.messages.aboutDialogIsOpen, (_, dialogIsOpen) =>
                assert.isTrue(dialogIsOpen),
            )
            mocking.send.ipc.toRenderer(
                ipc.messages.about,
                {},
                {
                    applicationIconPath: "path/to/icon",
                    applicationName: "mdview",
                    applicationDescription: "Some description",
                    applicationVersion: "0.0.0",
                    homepage: "example.com",
                    issueLink: "example.com/issues",
                    frameworkVersions: [["some-framework", "0.0.1"]],
                },
            )
            assert.isTrue(dialog.isOpen())
            assert.strictEqual(dialog.current().id, about.DIALOG_ID)
        })

        it("closes", () => {
            mocking.register.ipc.mainOn(ipc.messages.aboutDialogIsOpen, (_, dialogIsOpen) =>
                assert.isFalse(dialogIsOpen),
            )

            about.open()
            assert.isTrue(dialog.isOpen())
            assert.strictEqual(dialog.current().id, about.DIALOG_ID)

            dialog.close()
            assert.isFalse(dialog.isOpen())
            assert.isNull(dialog.current())
        })
    })
})
