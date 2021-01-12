const path = require("path")

const assert = require("chai").assert

const lib = require("./lib")

describe("Integration tests", () => {
    const defaultDocumentFile = "testfile_utf8.md"
    const defaultDocumentPath = path.join(__dirname, "documents", defaultDocumentFile)

    let app
    let client

    beforeEach(async () => {
        app = await lib.startApp(defaultDocumentPath)
        client = app.client
    })

    afterEach(async () => await lib.stopApp(app))

    it("opens a window", async () => {
        client.waitUntilWindowLoaded()
        assert.eventually.equal(client.getWindowCount(), 1)
    })

    it("has file name in title bar", async () => {
        assert.eventually.include(client.getTitle(), defaultDocumentFile)
    })
})
