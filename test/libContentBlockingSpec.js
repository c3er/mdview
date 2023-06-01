const assert = require("chai").assert

const mocking = require("./mocking")

describe("Content blocking", () => {
    const expectedUrl = "http://example.com"

    describe("Main part", () => {
        const ipc = require("../app/lib/ipc/ipcMain")
        const contentBlocking = require("../app/lib/contentBlocking/contentBlockingMain")

        beforeEach(() => {
            ipc.init(mocking.mainWindow, mocking.electron)
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
            const unblockMessage = ipc.messages.unblockURL
            mocking.register.ipc.mainOn(unblockMessage, (_, url) => assert.equal(url, expectedUrl))
            mocking.send.ipc.toMain(unblockMessage, {}, expectedUrl)
        })

        it("unblocks always redirection URLs", () => {
            mocking.register.webRequest.onBeforeRedirect(details =>
                assert.equal(details.redirectURL, expectedUrl),
            )
            mocking.send.webRequest.beforeRedirect({
                redirectURL: expectedUrl,
            })
            assert.isTrue(contentBlocking.unblockedURLs.includes(expectedUrl))
        })

        describe("Request handler", () => {
            function buildRequestCallback(isBlocked) {
                return options => assert.equal(options.cancel, isBlocked)
            }

            beforeEach(() =>
                mocking.register.webRequest.onBeforeRequest(details =>
                    assert.equal(details.url, expectedUrl),
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
                mocking.send.ipc.toMain(ipc.messages.unblockURL, {}, expectedUrl)
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
        const ipc = require("../app/lib/ipc/ipcRenderer")
        const contentBlocking = require("../app/lib/contentBlocking/contentBlockingRenderer")

        beforeEach(() => {
            ipc.init(mocking.electron)
            contentBlocking.init(mocking.document, mocking.window, mocking.electron, true)
        })

        afterEach(() => {
            mocking.clear()
            contentBlocking.reset()
        })

        it("has no blocked elements in default", () => {
            assert.isFalse(contentBlocking.hasBlockedElements())
        })

        it("blocks a URL", () => {
            mocking.send.ipc.toRenderer(ipc.messages.contentBlocked, {}, expectedUrl)
            assert.isTrue(contentBlocking.hasBlockedElements())
        })

        it("has no blocked URL after unblocking all", () => {
            mocking.register.ipc.rendererSend(ipc.messages.unblockURL)
            mocking.register.ipc.rendererSend(ipc.messages.allContentUnblocked)

            // First, block a URL
            mocking.send.ipc.toRenderer(ipc.messages.contentBlocked, {}, expectedUrl)

            mocking.send.ipc.toRenderer(ipc.messages.unblockAll)
            assert.isFalse(contentBlocking.hasBlockedElements())
        })
    })
})
