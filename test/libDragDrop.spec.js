const assert = require("chai").assert

const lib = require("./testLib")
const mocking = require("./mocking")

describe("Drag & drop", () => {
    describe("Renderer part", () => {
        const error = require("../app/lib/error/errorRenderer")
        const dragDrop = require("../app/lib/dragDrop/dragDropRenderer")
        const ipc = require("../app/lib/ipc/ipcRenderer")

        const filePathToDrop = lib.DEFAULT_DOCUMENT_PATH

        function drop(filePath) {
            dragDrop.dropHandler(mocking.createEventWithFile(filePath))
        }

        beforeEach(() => {
            error.reset()
            dragDrop.reset()
            mocking.clear()

            ipc.init(mocking.electron)
            error.init(mocking.document, true)
            dragDrop.init(mocking.document)
        })

        it("opens a dialog after drop", () => {
            drop(filePathToDrop)
            assert.isTrue(dragDrop.dialogIsOpen())
        })

        it("diaplays an error after trying to drop a directory", () => {
            const invalidFile = lib.DEFAULT_DOCUMENT_DIR

            drop(invalidFile)
            assert.isTrue(error.isOpen())

            const errorMessage = error.lastErrorMessage()
            assert.include(errorMessage, "directory")
            assert.include(errorMessage, invalidFile)
        })

        it("can close the dialog", () => {
            drop(filePathToDrop)
            dragDrop.closeDialog()
            assert.isFalse(dragDrop.dialogIsOpen())
        })

        it("can open the file without dialog", () => {
            mocking.register.ipc.mainOn(ipc.messages.openFile, (_, filePath) =>
                assert.strictEqual(filePath, filePathToDrop),
            )

            dragDrop.setBehavior(dragDrop.behavior.currentWindow)
            drop(filePathToDrop)

            assert.isFalse(dragDrop.dialogIsOpen())
        })

        it("can open the file in a new window without dialog", () => {
            mocking.register.ipc.mainOn(ipc.messages.openFileInNewWindow, (_, filePath) =>
                assert.strictEqual(filePath, filePathToDrop),
            )

            dragDrop.setBehavior(dragDrop.behavior.newWindow)
            drop(filePathToDrop)

            assert.isFalse(dragDrop.dialogIsOpen())
        })
    })
})