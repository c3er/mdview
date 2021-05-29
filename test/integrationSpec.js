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
    rawText: {
        path: "//div[@id='raw-text']",
    },
}

const defaultDocumentFile = "testfile_utf8.md"
const defaultDocumentPath = path.join(__dirname, "documents", defaultDocumentFile)

let app
let client

async function checkUnblockedMessage() {
    let hasFoundUnblockedMessage = false
    ;(await client.getMainProcessLogs()).forEach(log => {
        if (log.toLowerCase().includes("unblocked")) {
            hasFoundUnblockedMessage = true
        }
    })
    return hasFoundUnblockedMessage
}

async function elementIsVisible(element) {
    return (await element.getCSSProperty("display")).value !== "none"
}

describe("Integration tests with single app instance", () => {
    before(async () => {
        app = await lib.startApp(defaultDocumentPath)
        client = app.client
    })

    after(async () => await lib.stopApp(app))

    it("opens a window", async () => {
        client.waitUntilWindowLoaded()
        await assert.eventually.equal(client.getWindowCount(), 1)
    })

    it("has file name in title bar", async () => {
        await assert.eventually.include(client.getTitle(), defaultDocumentFile)
    })

    it("displays blocked content banner", async () => {
        const elem = await client.$(elements.blockedContentArea.path)
        assert.equal(await elem.getAttribute("hidden"), null)
    })

    describe('Library "storage"', () => {
        const dataDir = path.join(__dirname, "data")
        const storage = require("../app/lib/storage")

        describe("Settings", () => {
            const DEFAULT_THEME = storage.LIGHT_THEME

            let settings
            let electronMock

            beforeEach(() => {
                electronMock = {
                    nativeTheme: {
                        themeSource: DEFAULT_THEME,
                    },
                }
                settings = storage.initSettings(dataDir, storage.SETTINGS_FILE, electronMock)
                settings.theme = DEFAULT_THEME
            })

            describe("Theme", () => {
                it("has a default theme", () => {
                    assert.equal(settings.theme, DEFAULT_THEME)
                })

                it("remembers light theme", () => {
                    const theme = storage.LIGHT_THEME
                    settings.theme = theme
                    assert.equal(settings.theme, theme)
                })

                it("remembers dark theme", () => {
                    const theme = storage.DARK_THEME
                    settings.theme = theme
                    assert.equal(settings.theme, theme)
                })

                it("does not accept an unknown theme", () => {
                    assert.throws(() => (settings.theme = "invalid-theme"))
                })
            })
        })

        describe("Encodings", () => {
            const encodings = storage.initEncodings(dataDir, storage.ENCODINGS_FILE)

            it("loads known encoding", () => {
                const TESTPATH = "test1"
                const ENCODING = "ISO-8859-15"
                encodings.save(TESTPATH, ENCODING)
                assert.equal(encodings.load(TESTPATH), ENCODING)
            })

            it("loads default encoding if path is not known", () => {
                assert.equal(encodings.load("unknown-file"), encodings.DEFAULT)
            })
        })
    })

    describe("Main menu", () => {
        for (const [_, mainItem] of Object.entries(elements.mainMenu)) {
            describe(`Menu "${mainItem.label}"`, () => {
                for (const [_, item] of Object.entries(mainItem.sub)) {
                    it(`has item "${item.label}"`, async () => {
                        await assert.eventually.ok(
                            menuAddon.getMenuItem(mainItem.label, item.label)
                        )
                    })

                    it(`item "${item.label}" is ${
                        item.isEnabled ? "enabled" : "disabled"
                    }`, async () => {
                        const actualItem = await menuAddon.getMenuItem(mainItem.label, item.label)
                        assert.equal(actualItem.enabled, item.isEnabled)
                    })
                }
            })
        }
    })

    describe("Raw text", () => {
        it("is invisible", async () => {
            await assert.eventually.isFalse(elementIsVisible(await client.$(elements.rawText.path)))
        })
    })
})

describe("Integration tests with their own app instance each", () => {
    beforeEach(async () => {
        app = await lib.startApp(defaultDocumentPath)
        client = app.client
    })

    afterEach(async () => await lib.stopApp(app))

    describe("Blocked content", () => {
        describe("UI element", () => {
            it("disappears at click on X", async () => {
                ;(await client.$(elements.blockedContentArea.closeButton.path)).click()
                await assert.eventually.isFalse(
                    elementIsVisible(await client.$(elements.blockedContentArea.path))
                )
            })

            it("unblocks content", async () => {
                const blockedContentElement = await client.$(elements.blockedContentArea.path)
                blockedContentElement.click()
                await assert.eventually.isTrue(lib.wait(checkUnblockedMessage))
            })
        })

        describe("Menu item", () => {
            it("unblocks content", async () => {
                const viewMenu = elements.mainMenu.view
                const viewMenuLabel = viewMenu.label
                const unblockMenuLabel = viewMenu.sub.unblock.label

                await menuAddon.clickMenu(viewMenuLabel, unblockMenuLabel)
                const blockedConetentMenuItem = await menuAddon.getMenuItem(
                    viewMenuLabel,
                    unblockMenuLabel
                )

                await assert.eventually.isTrue(lib.wait(checkUnblockedMessage))
                assert.isFalse(blockedConetentMenuItem.enabled)
            })
        })
    })

    describe("Raw text", () => {
        it("can be activated", async () => {
            const viewMenu = elements.mainMenu.view

            await menuAddon.clickMenu(viewMenu.label, viewMenu.sub.rawText.label)

            await assert.eventually.isTrue(elementIsVisible(await client.$(elements.rawText.path)))
            await assert.eventually.isFalse(
                elementIsVisible(await client.$("//div[@class='markdown-body']"))
            )
        })
    })
})
