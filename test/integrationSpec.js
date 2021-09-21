const path = require("path")

const chai = require("chai")
const chaiAsPromised = require("chai-as-promised")
const electron = require("electron")
const menuAddon = require("spectron-menu-addon-v2").default

const mocking = require("./mocking")

const assert = chai.assert

const defaultDocumentFile = "testfile_utf8.md"
const defaultDocumentPath = path.join(__dirname, "documents", defaultDocumentFile)

let app
let client

// Based on https://stackoverflow.com/a/39914235/13949398 (What is the JavaScript version of sleep()?)
function sleep(ms) {
    // console.debug(`sleep ${ms} ${process.hrtime()}`) // For debugging
    return new Promise(resolve => setTimeout(resolve, ms))
}

async function startApp(documentPath) {
    const app = menuAddon.createApplication({
        path: electron,
        args: [path.join(__dirname, ".."), documentPath, "--test"],
    })
    chaiAsPromised.transferPromiseness = app.transferPromiseness
    return app.start()
}

async function stopApp(app) {
    if (app && app.isRunning()) {
        await app.stop()
    }
}

async function wait(predicate, tries, timeout) {
    tries = tries || 10
    timeout = timeout || 100
    for (let i = 0; i < tries; i++) {
        if (await predicate()) {
            return true
        }
        await sleep(timeout)
    }
    return false
}

async function containsConsoleMessage(message) {
    let hasFoundMessage = false
    ;(await client.getMainProcessLogs()).forEach(log => {
        if (log.toLowerCase().includes(message)) {
            hasFoundMessage = true
        }
    })
    return hasFoundMessage
}

async function checkUnblockedMessage() {
    return await containsConsoleMessage("unblocked")
}

async function elementIsVisible(element) {
    return (await element.getCSSProperty("display")).value !== "none"
}

global.before(() => chai.use(chaiAsPromised))

describe("Integration tests with single app instance", () => {
    before(async () => {
        app = await startApp(defaultDocumentPath)
        client = app.client
    })

    after(async () => await stopApp(app))

    it("opens a window", async () => {
        client.waitUntilWindowLoaded()
        await assert.eventually.equal(client.getWindowCount(), 1)
    })

    it("has file name in title bar", async () => {
        await assert.eventually.include(client.getTitle(), defaultDocumentFile)
    })

    it("displays blocked content banner", async () => {
        const elem = await client.$(mocking.elements.blockedContentArea.path)
        assert.equal(await elem.getAttribute("hidden"), null)
    })

    describe('Library "storage"', () => {
        const storage = require("../app/lib/main/storage")

        describe("Application settings", () => {
            let applicationSettings

            beforeEach(() => {
                mocking.resetElectron()
                storage.init(mocking.electron)
                applicationSettings = storage.initApplicationSettings(
                    mocking.dataDir,
                    storage.APPLICATION_SETTINGS_FILE
                )
                applicationSettings.theme = mocking.DEFAULT_THEME
            })

            describe("Theme", () => {
                it("has a default theme", () => {
                    assert.equal(applicationSettings.theme, mocking.DEFAULT_THEME)
                })

                it("remembers light theme", () => {
                    const theme = applicationSettings.LIGHT_THEME
                    applicationSettings.theme = theme
                    assert.equal(applicationSettings.theme, theme)
                })

                it("remembers dark theme", () => {
                    const theme = applicationSettings.DARK_THEME
                    applicationSettings.theme = theme
                    assert.equal(applicationSettings.theme, theme)
                })

                it("does not accept an unknown theme", () => {
                    assert.throws(() => (applicationSettings.theme = "invalid-theme"))
                })
            })
        })

        describe("Document settings", () => {
            describe("Encodings", () => {
                function initDocumentSettings(filePath) {
                    return storage.initDocumentSettings(
                        mocking.dataDir,
                        storage.DOCUMENT_SETTINGS_FILE,
                        filePath
                    )
                }

                it("loads known encoding", () => {
                    const ENCODING = "ISO-8859-15"
                    const documentSettings = initDocumentSettings("test1")
                    documentSettings.encoding = ENCODING
                    assert.equal(documentSettings.encoding, ENCODING)
                })

                it("loads default encoding if path is not known", () => {
                    const documentSettings = initDocumentSettings("unknown-file")
                    assert.equal(documentSettings.encoding, documentSettings.ENCODING_DEFAULT)
                })
            })
        })
    })

    describe("Main menu", () => {
        for (const [_, mainItem] of Object.entries(mocking.elements.mainMenu)) {
            describe(`Menu "${mainItem.label}"`, () => {
                for (const [_, item] of Object.entries(mainItem.sub)) {
                    it(`has item "${item.label}"`, async () => {
                        assert.notEqual(
                            await menuAddon.getMenuItem(mainItem.label, item.label).label,
                            ""
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
            await assert.eventually.isFalse(
                elementIsVisible(await client.$(mocking.elements.rawText.path))
            )
        })
    })
})

describe("Integration tests with their own app instance each", () => {
    beforeEach(async () => {
        app = await startApp(defaultDocumentPath)
        client = app.client
    })

    afterEach(async () => await stopApp(app))

    describe("Blocked content", () => {
        describe("UI element", () => {
            it("disappears at click on X", async () => {
                ;(await client.$(mocking.elements.blockedContentArea.closeButton.path)).click()
                await assert.eventually.isFalse(
                    elementIsVisible(await client.$(mocking.elements.blockedContentArea.path))
                )
            })

            it("unblocks content", async () => {
                const blockedContentElement = await client.$(
                    mocking.elements.blockedContentArea.path
                )
                blockedContentElement.click()
                await assert.eventually.isTrue(wait(checkUnblockedMessage))
            })
        })

        describe("Menu item", () => {
            it("unblocks content", async () => {
                const viewMenu = mocking.elements.mainMenu.view
                const viewMenuLabel = viewMenu.label
                const unblockMenuLabel = viewMenu.sub.unblock.label

                await menuAddon.clickMenu(viewMenuLabel, unblockMenuLabel)
                const blockedConetentMenuItem = await menuAddon.getMenuItem(
                    viewMenuLabel,
                    unblockMenuLabel
                )

                await assert.eventually.isTrue(wait(checkUnblockedMessage))
                assert.isFalse(blockedConetentMenuItem.enabled)
            })
        })
    })

    describe("Raw text", () => {
        it("can be activated", async () => {
            const viewMenu = mocking.elements.mainMenu.view

            await menuAddon.clickMenu(viewMenu.label, viewMenu.sub.rawText.label)

            await assert.eventually.isTrue(
                elementIsVisible(await client.$(mocking.elements.rawText.path))
            )
            await assert.eventually.isFalse(
                elementIsVisible(await client.$("//div[@class='markdown-body']"))
            )
        })
    })

    describe("Theme switching", () => {
        it("can be done", async () => {
            const viewMenu = mocking.elements.mainMenu.view
            await menuAddon.clickMenu(viewMenu.label, viewMenu.sub.switchTheme.label)
            await assert.eventually.isFalse(containsConsoleMessage("error"))
        })
    })
})
