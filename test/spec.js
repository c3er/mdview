const lib = require("./lib")

describe("Main tests", () => {
    let app

    beforeEach(async () => app = await lib.startApp())

    afterEach(async () => await lib.stopApp(app))

    it("opens a window", async () => {
        app.client.waitUntilWindowLoaded()
        app.client.getWindowCount().should.eventually.equal(1)
    })
})
