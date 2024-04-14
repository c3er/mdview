const assert = require("assert")

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
                assert(Boolean(aboutInfo.applicationIconPath))
                assert(Boolean(aboutInfo.applicationName))
                assert(Boolean(aboutInfo.applicationDescription))
                assert(Boolean(aboutInfo.applicationVersion))
                assert(Boolean(aboutInfo.homepage))
                assert(Boolean(aboutInfo.issueLink))
                assert(Boolean(aboutInfo.frameworkVersions))
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
                assert(dialogIsOpen),
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
            assert(dialog.isOpen())
            assert.strictEqual(dialog.current().id, about.DIALOG_ID)
        })

        it("closes", () => {
            mocking.register.ipc.mainOn(ipc.messages.aboutDialogIsOpen, (_, dialogIsOpen) =>
                assert(!dialogIsOpen),
            )

            about.open()
            assert(dialog.isOpen())
            assert.strictEqual(dialog.current().id, about.DIALOG_ID)

            dialog.close()
            assert(!dialog.isOpen())
            assert(dialog.current() === null)
        })
    })
})
