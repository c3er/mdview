const assert = require("assert")
const path = require("path")

const mocking = require("./mocking")

const documentDirectory = path.join(__dirname, "documents", "navigation")
const mdFilePath1 = path.join(documentDirectory, "file1.md")
const mdFilePath2 = path.join(documentDirectory, "file2.md")
const mdFilePath3 = path.join(documentDirectory, "file3.md")
const htmlFilePath = path.join(documentDirectory, "file.html")

describe("Navigation", () => {
    describe("Main part", () => {
        const ipc = require("../app/lib/ipcMain")
        const navigation = require("../app/lib/navigationMain")
        const storage = require("../app/lib/main/storage")

        function prepareAssertion(expectedFilePath) {
            mocking.clear()
            mocking.register.ipc.rendererOn(ipc.messages.resetContentBlocking)
            mocking.register.ipc.rendererOn(ipc.messages.fileOpen, (_, { path: filePath }) =>
                assert.strictEqual(filePath, expectedFilePath),
            )
        }

        function assertHistoryJumping(canGoBack, canGoForward) {
            assert.strictEqual(navigation.canGoBack(), canGoBack)
            assert.strictEqual(navigation.canGoForward(), canGoForward)
        }

        function go(expectedFilePath) {
            prepareAssertion(expectedFilePath)
            navigation.go(expectedFilePath)
        }

        function back(expectedFilePath) {
            prepareAssertion(expectedFilePath)
            navigation.back()
        }

        function forward(expectedFilePath) {
            prepareAssertion(expectedFilePath)
            navigation.forward()
        }

        beforeEach(() => {
            ipc.init(mocking.mainWindow, mocking.electron)
            storage.init(mocking.dataDir, mocking.electron)
            navigation.init(mocking.mainMenu)
        })

        it("goes to a Markdown file without previous history", () => {
            go(mdFilePath1)
            assertHistoryJumping(false, false)
        })

        it("goes back and forth between files", () => {
            go(mdFilePath1)
            assertHistoryJumping(false, false)

            go(mdFilePath2)
            go(mdFilePath3)
            go(htmlFilePath)
            assertHistoryJumping(true, false)

            back(mdFilePath3)
            assertHistoryJumping(true, true)

            back(mdFilePath2)
            assertHistoryJumping(true, true)

            forward(mdFilePath3)
            assertHistoryJumping(true, true)

            forward(htmlFilePath)
            assertHistoryJumping(true, false)

            forward()
            assertHistoryJumping(true, false)

            back(mdFilePath3)
            back(mdFilePath2)
            back(mdFilePath1)
            assertHistoryJumping(false, true)

            back()
            assertHistoryJumping(false, true)

            go(htmlFilePath)
            assertHistoryJumping(true, false)
        })
    })

    describe("Renderer part", () => {
        const ipc = require("../app/lib/ipcRenderer")
        const navigation = require("../app/lib/navigationRenderer")

        let htmlElement
        let event

        beforeEach(() => {
            htmlElement = mocking.loadHtmlElement()
            mocking.registerHtmlElement(htmlElement)
            event = mocking.createEvent()
            ipc.init(mocking.electron)
            navigation.init(mocking.electron)
        })

        it("gets events", () => {
            htmlElement.onclick = htmlElement.onauxclick = null
            navigation.registerLink(htmlElement, mdFilePath1, documentDirectory)

            assert(event.onclick !== null)
            assert(event.onauxclick !== null)
        })
    })
})
