const path = require("path")

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
        client.getWindowCount().should.eventually.equal(1)
    })

    it("has file name in title bar", async () => {
        client.getTitle().should.eventually.include(defaultDocumentFile)
    })
})
