const path = require("path")

const assert = require("chai").assert

const mocking = require("./mocking")

const ipc = require("../app/lib/ipc")

describe("Navigation", () => {
    describe("Main part", () => {
        const navigation = require("../app/lib/navigation/navigationMain")

        const mdFilePath1 = path.join(__dirname, "documents", "navigation", "file1.md")
        const mdFilePath2 = path.join(__dirname, "documents", "navigation", "file2.md")
        const mdFilePath3 = path.join(__dirname, "documents", "navigation", "file3.md")
        const htmlFilePath = path.join(__dirname, "documents", "navigation", "file.html")

        function prepareAssertion(expectedFilePath) {
            mocking.clear()
            mocking.register.ipc.rendererOn(ipc.messages.fileOpen, (_, filePath) =>
                assert.equal(filePath, expectedFilePath)
            )
        }

        function assertHistoryJumping(canGoBack, canGoForward) {
            assert.equal(navigation.canGoBack(), canGoBack)
            assert.equal(navigation.canGoForward(), canGoForward)
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

        beforeEach(() =>
            navigation.init(mocking.mainWindow, mocking.mainMenu, mocking.electron, mocking.dataDir)
        )

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
})
