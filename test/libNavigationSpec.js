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

        beforeEach(() =>
            navigation.init(mocking.mainWindow, mocking.mainMenu, mocking.electron, mocking.dataDir)
        )

        it("goes to a Markdown file without previous history", () => {
            mocking.register.ipc.rendererOn(ipc.messages.fileOpen, (_, filePath) =>
                assert.equal(filePath, mdFilePath1)
            )
            navigation.go(mdFilePath1)
        })
    })
})
