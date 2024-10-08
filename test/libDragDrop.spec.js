const assert = require("assert")

const lib = require("./testLib")
const mocking = require("./mocking")

describe("Drag & drop", () => {
    describe("Renderer part", () => {
        const error = require("../app/lib/errorRenderer")
        const dialog = require("../app/lib/dialogRenderer")
        const dragDrop = require("../app/lib/dragDropRenderer")
        const ipc = require("../app/lib/ipcRenderer")

        const filePathToDrop = lib.DEFAULT_DOCUMENT_PATH

        function drop(filePath) {
            dragDrop.dropHandler(mocking.createEventWithFile(filePath))
        }

        beforeEach(() => {
            error.reset()
            dialog.reset()
            dragDrop.reset()
            mocking.clear()

            ipc.init(mocking.electron)
            error.init(mocking.document, true)
            dragDrop.init(mocking.document)
        })

        it("opens a dialog after drop", () => {
            drop(filePathToDrop)
            assert(dialog.isOpen())
            assert.strictEqual(dialog.current().id, dragDrop.DIALOG_ID)
        })

        it("diaplays an error after trying to drop a directory", () => {
            const invalidFile = lib.DEFAULT_DOCUMENT_DIR

            drop(invalidFile)

            assert(dialog.isOpen())
            assert.strictEqual(dialog.current().id, error.DIALOG_ID)

            const errorMessage = error.lastErrorMessage()
            assert(errorMessage.includes("directory"))
            assert(errorMessage.includes(invalidFile))
        })

        it("can close the dialog", () => {
            drop(filePathToDrop)
            assert.strictEqual(dialog.current().id, dragDrop.DIALOG_ID)

            dialog.close()
            assert(!dialog.isOpen())
            assert(dialog.current() === null)
        })

        it("can open the file without dialog", () => {
            mocking.register.ipc.mainOn(ipc.messages.openFile, (_, filePath) =>
                assert.strictEqual(filePath, filePathToDrop),
            )

            dragDrop.setBehavior(dragDrop.behavior.currentWindow)
            drop(filePathToDrop)

            assert(!dialog.isOpen())
            assert(dialog.current() === null)
        })

        it("can open the file in a new window without dialog", () => {
            mocking.register.ipc.mainOn(ipc.messages.openFileInNewWindow, (_, filePath) =>
                assert.strictEqual(filePath, filePathToDrop),
            )

            dragDrop.setBehavior(dragDrop.behavior.newWindow)
            drop(filePathToDrop)

            assert(!dialog.isOpen())
            assert(dialog.current() === null)
        })
    })
})
