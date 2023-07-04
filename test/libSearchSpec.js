const assert = require("chai").assert

const mocking = require("./mocking")

describe("Search", () => {
    describe("Main part", () => {
        const ipc = require("../app/lib/ipc/ipcMain")
        const search = require("../app/lib/search/searchMain")

        beforeEach(() => {
            ipc.init(mocking.mainWindow, mocking.electron)
            search.init(mocking.mainMenu)
        })

        afterEach(() => mocking.clear())

        it("starts", () => {
            mocking.register.ipc.webContentsSend(ipc.messages.search)
            search.start()
        })

        it("searches next term", () => {
            mocking.register.ipc.webContentsSend(ipc.messages.searchNext)
            search.next()
        })

        it("searches previous term", () => {
            mocking.register.ipc.webContentsSend(ipc.messages.searchPrevious)
            search.previous()
        })
    })

    describe("Renderer part", () => {
        const ipc = require("../app/lib/ipc/ipcRenderer")
        const renderer = require("../app/lib/renderer/common")
        const search = require("../app/lib/search/searchRenderer")

        function initSearch() {
            search.init(mocking.document, () => {})
        }

        function performSearch(searchTerm) {
            const dialogElement = mocking.loadHtmlElement()
            const dialogCallbacks = []
            dialogElement.addEventListener = (_, callback) => dialogCallbacks.push(callback)
            if (searchTerm) {
                dialogElement.returnValue = searchTerm
            }
            mocking.registerHtmlElement(dialogElement)

            mocking.register.ipc.mainOn(ipc.messages.searchIsActive)
            initSearch()

            mocking.send.ipc.toRenderer(ipc.messages.search)

            for (const callback of dialogCallbacks) {
                callback(mocking.createEvent())
            }
        }

        beforeEach(() => {
            renderer.init(mocking.document)
            ipc.init(mocking.electron)
        })

        afterEach(() => {
            search.reset()
            mocking.clear()
            mocking.resetHtmlElement()
        })

        it("is not active by default", () => {
            initSearch()
            assert.isFalse(search.isActive())
        })

        it("is active after confirming the dialog", () => {
            const searchTerm = "expected search term"

            mocking.register.ipc.mainOn(ipc.messages.searchIsActive, (_, value) =>
                assert.isTrue(value),
            )

            performSearch(searchTerm)
            assert.isTrue(search.isActive())
            assert.strictEqual(search.term(), searchTerm)
        })

        it("is inactive after cancelling the dialog", () => {
            performSearch(search.CANCEL_VALUE)
            assert.isFalse(search.isActive())
        })

        describe("Function highlightTerm", () => {
            it("highlights the search term", () => {
                const searchTerm = "expected search term"

                const contentElement = mocking.loadHtmlElement()
                contentElement.innerHTML =
                    contentElement.innerText = `some text containing ${searchTerm}`
                contentElement.setAttribute = (attr, value) => {
                    assert.strictEqual(attr, "id")
                    assert.strictEqual(value, search.SELECTED_SEARCH_RESULT_ID)
                }
                mocking.registerHtmlElement(contentElement)

                performSearch(searchTerm)
                assert.isTrue(search.isActive())

                search.highlightTerm()
                const content = contentElement.innerHTML
                assert.include(content, `class="${search.SEARCH_RESULT_CLASS}"`)
            })

            it("doesn't change the content, if term was not found", () => {
                const content = "some text not containing the search term"

                const contentElement = mocking.loadHtmlElement()
                contentElement.innerHTML = contentElement.innerText = content
                mocking.registerHtmlElement(contentElement)

                performSearch("some text not to be found")
                assert.isTrue(search.isActive())

                search.highlightTerm()
                assert.isFalse(search.isActive())
                assert.strictEqual(contentElement.innerHTML, content)
            })
        })
    })
})
