const path = require("path")

const assert = require("chai").assert
const menuAddon = require("spectron-menu-addon-v2").default

const lib = require("./lib")

const elements = {
    mainMenu: {
        file: {
            label: "File",
            sub: {
                open: {
                    label: "Open",
                    isEnabled: true,
                },
                print: {
                    label: "Print",
                    isEnabled: true,
                },
                quit: {
                    label: "Quit",
                    isEnabled: true,
                },
            },
        },
        edit: {
            label: "Edit",
            sub: {
                copy: {
                    label: "Copy",
                    isEnabled: true,
                },
            },
        },
        view: {
            label: "View",
            sub: {
                refresh: {
                    label: "Refresh",
                    isEnabled: true,
                },
                unblock: {
                    label: "Unblock All External Content",
                    isEnabled: true,
                },
                rawText: {
                    label: "View Raw Text",
                    isEnabled: true,
                },
            },
        },
        encoding: {
            label: "Encoding",
            sub: {},
        },
        tools: {
            label: "Tools",
            sub: {
                developer: {
                    label: "Developer Tools",
                    isEnabled: true,
                },
            },
        },
    },
    blockedContentArea: {
        path: "//div[@id='blocked-content-info']",
        closeButton: {
            path: "//span[@id='blocked-content-info-close-button']",
        },
    },
}

const defaultDocumentFile = "testfile_utf8.md"
const defaultDocumentPath = path.join(__dirname, "documents", defaultDocumentFile)

let app
let client

describe("Integration tests with single app instance", () => {
    before(async () => {
        app = await lib.startApp(defaultDocumentPath)
        client = app.client
    })

    after(async () => await lib.stopApp(app))

    it("opens a window", async () => {
        client.waitUntilWindowLoaded()
        assert.eventually.equal(client.getWindowCount(), 1)
    })

    it("has file name in title bar", async () => {
        assert.eventually.include(client.getTitle(), defaultDocumentFile)
    })

    it("displays blocked content banner", async () => {
        const elem = await client.$(elements.blockedContentArea.path)
        assert.eventually.equal(elem.getAttribute("hidden"), null)
    })

    describe('Library "encodingStorage"', () => {
        const TESTPATH = "test1"
        let encodingStorage

        before(() => {
            encodingStorage = require("../lib/encodingStorage")
            encodingStorage.init(path.join(__dirname, "encodings.json"))
        })

        it("loads known encoding", () => {
            const ENCODING = "ISO-8859-15"
            encodingStorage.save(TESTPATH, ENCODING)
            assert.equal(encodingStorage.load(TESTPATH), ENCODING)
        })

        it("loads default encoding if path is not known", () => {
            assert.equal(encodingStorage.load("unknown-file"), encodingStorage.DEFAULT_ENCODING)
        })
    })

    describe("Main menu", () => {
        for (const [_, mainItem] of Object.entries(elements.mainMenu)) {
            describe(`Menu "${mainItem.label}"`, () => {
                for (const [_, item] of Object.entries(mainItem.sub)) {
                    it(`has item "${item.label}"`, async () => {
                        assert.eventually.ok(menuAddon.getMenuItem(mainItem.label, item.label))
                    })

                    it(`item "${item.label}" is ${item.isEnabled ? "enabled" : "disabled"}`, async () => {
                        const actualItem = await menuAddon.getMenuItem(mainItem.label, item.label)
                        assert.equal(actualItem.enabled, item.isEnabled)
                    })
                }
            })
        }
    })
})

describe("Integration tests with their own app instance each", () => {
    beforeEach(async () => {
        app = await lib.startApp(defaultDocumentPath)
        client = app.client
    })

    afterEach(async () => await lib.stopApp(app))

    describe("Blocked content element", () => {
        it("disappears at click on X", async () => {
            const blockedContentElement = await client.$(elements.blockedContentArea.path)
            const closeButton = await client.$(elements.blockedContentArea.closeButton.path)

            closeButton.click()
            assert.eventually.equal(blockedContentElement.getAttribute("hidden"), true)
        })

        it("unblocks content", async () => {
            const blockedContentElement = await client.$(elements.blockedContentArea.path)
            blockedContentElement.click()

            assert.isTrue(await lib.wait(async () => {
                let hasFoundUnblockedMessage = false;
                (await client.getMainProcessLogs()).forEach(log => {
                    if (log.toLowerCase().includes("unblocked")) {
                        hasFoundUnblockedMessage = true
                    }
                })
                return hasFoundUnblockedMessage
            }))
        })
    })
})
