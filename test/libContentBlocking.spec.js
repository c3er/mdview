const assert = require("assert")

const mocking = require("./mocking")

describe("Content blocking", () => {
    const expectedUrl = "http://example.com"

    describe("Main part", () => {
        const ipc = require("../app/lib/ipcMain")
        const contentBlocking = require("../app/lib/contentBlockingMain")
        const storage = require("../app/lib/storageMain")

        beforeEach(() => {
            ipc.init(mocking.mainWindow, mocking.electron)
            storage.init(mocking.dataDir, mocking.electron)
            contentBlocking.init(mocking.mainMenu, mocking.electron)
        })

        afterEach(() => {
            mocking.clear()
            contentBlocking.clearUnblockedURLs()
        })

        it("unblocks all", () => {
            mocking.register.ipc.webContentsSend(ipc.messages.unblockAll)
            contentBlocking.unblockAll()
        })

        it("unblocks a URL", () => {
            const unblockMessage = ipc.messages.unblock
            mocking.register.ipc.mainOn(unblockMessage, (_, url) =>
                assert.strictEqual(url, expectedUrl),
            )
            mocking.send.ipc.toMain(unblockMessage, {}, expectedUrl)
        })

        it("unblocks always redirection URLs", () => {
            mocking.register.webRequest.onBeforeRedirect(details =>
                assert.strictEqual(details.redirectURL, expectedUrl),
            )
            mocking.send.webRequest.beforeRedirect({
                redirectURL: expectedUrl,
            })
            assert(contentBlocking.unblockedURLs.includes(expectedUrl))
        })

        describe("Request handler", () => {
            function buildRequestCallback(isBlocked) {
                return options => assert.strictEqual(options.cancel, isBlocked)
            }

            beforeEach(() =>
                mocking.register.webRequest.onBeforeRequest(details =>
                    assert.strictEqual(details.url, expectedUrl),
                ),
            )

            it("blocks a URL", () => {
                mocking.register.ipc.webContentsSend(ipc.messages.contentBlocked)
                mocking.send.webRequest.beforeRequest(
                    {
                        url: expectedUrl,
                    },
                    buildRequestCallback(true),
                )
            })

            it("does not block an unblocked URL", () => {
                mocking.send.ipc.toMain(ipc.messages.unblock, {}, expectedUrl)
                mocking.send.webRequest.beforeRequest(
                    {
                        url: expectedUrl,
                    },
                    buildRequestCallback(false),
                )
            })
        })
    })

    describe("Renderer part", () => {
        const ipc = require("../app/lib/ipcRenderer")
        const contentBlocking = require("../app/lib/contentBlockingRenderer")

        beforeEach(() => {
            ipc.init(mocking.electron)
            contentBlocking.init(mocking.document, mocking.window, true, {})
        })

        afterEach(() => {
            mocking.clear()
            contentBlocking.reset()
        })

        it("has no blocked elements in default", () => {
            assert(!contentBlocking.hasBlockedElements())
        })

        it("blocks a URL", () => {
            mocking.send.ipc.toRenderer(ipc.messages.contentBlocked, {}, expectedUrl)
            assert(contentBlocking.hasBlockedElements())
        })

        it("has no blocked URL after unblocking all", () => {
            mocking.register.ipc.rendererSend(ipc.messages.unblock)
            mocking.register.ipc.rendererSend(ipc.messages.allContentUnblocked)

            // First, block a URL
            mocking.send.ipc.toRenderer(ipc.messages.contentBlocked, {}, expectedUrl)

            mocking.send.ipc.toRenderer(ipc.messages.unblockAll)
            assert(!contentBlocking.hasBlockedElements())
        })
    })
})
