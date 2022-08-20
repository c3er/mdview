const fs = require("fs/promises")
const path = require("path")

const assert = require("chai").assert
const electronPath = require("electron")
const playwright = require("playwright")

const mocking = require("./mocking")

const electron = playwright._electron

const defaultDocumentFile = "testfile_utf8.md"
const defaultDocumentPath = path.join(__dirname, "documents", defaultDocumentFile)

let app
let page

const consoleMessages = []

function clearMessages() {
    consoleMessages.length = 0
}

function addMessage(msg) {
    consoleMessages.push(msg)
}

async function startApp(documentPath) {
    clearMessages()
    await fs.rm(mocking.dataDir, { force: true, recursive: true })

    const app = await electron.launch({
        args: [
            path.join(__dirname, "..", "app", "main.js"),
            documentPath,
            "--test",
            `--storage-dir="${mocking.dataDir}"`,
        ],
        executablePath: electronPath,
    })

    const page = await app.firstWindow()
    page.on("console", msg => addMessage(msg.text()))
    page.on("crash", () => assert.fail("Crash happened"))
    page.on("pageerror", error => assert.fail(`Page error: ${error}`))
    page.setDefaultTimeout(2000)
    await page.waitForSelector("div") // Wait until the window is actually loaded

    return [app, page]
}

async function clickMenuItemById(app, id) {
    app.evaluate(
        ({ Menu }, menuId) => Menu.getApplicationMenu().getMenuItemById(menuId).click(),
        id
    )
}

function containsConsoleMessage(message) {
    return !!consoleMessages.find(msg => msg.toLowerCase().includes(message.toLowerCase()))
}

function hasUnblockedContentMessage() {
    return containsConsoleMessage("unblocked")
}

async function elementIsHidden(page, elementPath) {
    return (
        (await page.waitForSelector(elementPath, {
            state: "hidden",
        })) === null
    )
}

describe("Integration tests with single app instance", () => {
    before(async () => ([app, page] = await startApp(defaultDocumentPath)))

    after(async () => await app.close())

    it("opens a window", () => {
        assert.exists(page)
    })

    it("has file name in title bar", async () => {
        assert.include(await page.title(), defaultDocumentFile)
    })

    it("displays blocked content banner", async () => {
        const elem = await page.$(mocking.elements.blockedContentArea.path)
        assert.isTrue(await elem.isVisible())
    })

    it("loads all local images", () => {
        assert.isFalse(containsConsoleMessage("ERR_FILE_NOT_FOUND"))
    })

    describe('Library "settings"', () => {
        const settings = require("../app/lib/main/settings")

        describe("Application settings", () => {
            let applicationSettings

            beforeEach(() => {
                mocking.resetElectron()
                settings.init(path.join(mocking.dataDir, settings.SUBDIR), mocking.electron)
                applicationSettings = settings.loadApplicationSettings()
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
                it("loads known encoding", () => {
                    const ENCODING = "ISO-8859-15"
                    const documentSettings = settings.loadDocumentSettings("test1")
                    documentSettings.encoding = ENCODING
                    assert.equal(documentSettings.encoding, ENCODING)
                })

                it("loads default encoding if path is not known", () => {
                    const documentSettings = settings.loadDocumentSettings("unknown-file")
                    assert.equal(documentSettings.encoding, documentSettings.ENCODING_DEFAULT)
                })
            })
        })
    })

    describe("Main menu", () => {
        async function searchMenuItem(menuItemPath) {
            return await app.evaluate(({ Menu }, itemPath) => {
                let menu = Menu.getApplicationMenu()
                let item
                for (const label of itemPath) {
                    item = menu.items.find(item => item.label === label)
                    menu = item.submenu
                }
                return {
                    label: item.label, // For debugging
                    enabled: item.enabled,
                    checked: item.checked,
                }
            }, menuItemPath)
        }

        function assertMenu(menu, itemPath) {
            for (const [_, currentItem] of Object.entries(menu)) {
                const currentItemLabel = currentItem.label
                const currentItemPath = [...itemPath, currentItemLabel]
                describe(`Menu item "${currentItemLabel}"`, () => {
                    it("exists", async () => {
                        assert.exists(await searchMenuItem(currentItemPath))
                    })

                    it(`is ${currentItem.isEnabled ? "enabled" : "disabled"}`, async () => {
                        assert.equal(
                            (await searchMenuItem(currentItemPath)).enabled,
                            currentItem.isEnabled
                        )
                    })

                    const isChecked = currentItem.isChecked ?? false
                    it(`is ${isChecked ? "checked" : "unchecked"}`, async () => {
                        assert.equal((await searchMenuItem(currentItemPath)).checked, isChecked)
                    })

                    const subMenu = currentItem.sub
                    if (subMenu) {
                        assertMenu(subMenu, currentItemPath)
                    }
                })
            }
        }

        assertMenu(mocking.elements.mainMenu, [])
    })

    describe("Raw text", () => {
        it("is invisible", async () => {
            assert.isTrue(await elementIsHidden(page, mocking.elements.rawText.path))
        })
    })
})

describe("Integration tests with their own app instance each", () => {
    beforeEach(async () => ([app, page] = await startApp(defaultDocumentPath)))

    afterEach(async () => await app.close())

    describe("Blocked content", () => {
        describe("UI element", () => {
            it("disappears at click on X", async () => {
                const blockedContentArea = mocking.elements.blockedContentArea
                const blockedContentAreaElement = await page.waitForSelector(
                    blockedContentArea.path
                )
                const blockedContentCloseButtonElement = await page.waitForSelector(
                    blockedContentArea.closeButton.path
                )

                await blockedContentCloseButtonElement.click()
                assert.isFalse(await blockedContentAreaElement.isVisible())
            })

            it("unblocks content", async () => {
                const blockedContentArea = mocking.elements.blockedContentArea
                const blockedContentAreaElement = await page.waitForSelector(
                    blockedContentArea.path
                )
                const blockedContentTextContainerElement = await page.waitForSelector(
                    blockedContentArea.textContainer.path
                )

                await blockedContentTextContainerElement.click()
                assert.isFalse(await blockedContentAreaElement.isVisible())
                assert.isTrue(hasUnblockedContentMessage())
            })
        })

        describe("Menu item", () => {
            it("unblocks content", async () => {
                const contentBlocking = require("../app/lib/contentBlocking/contentBlockingMain")
                const unblockContentMenuId = contentBlocking.UNBLOCK_CONTENT_MENU_ID

                await clickMenuItemById(app, unblockContentMenuId)

                assert.isTrue(await elementIsHidden(page, mocking.elements.blockedContentArea.path))
                assert.isFalse(
                    await app.evaluate(
                        ({ Menu }, menuId) =>
                            Menu.getApplicationMenu().getMenuItemById(menuId).enabled,
                        unblockContentMenuId
                    )
                )
                assert.isTrue(hasUnblockedContentMessage())
            })
        })
    })

    describe("Theme switching", () => {
        it("can be done", async () => {
            await clickMenuItemById(app, "switch-theme")
            assert.isFalse(containsConsoleMessage("error"))
        })
    })

    describe("Links in document", () => {
        it("changes title after click", async () => {
            const internalLinkElement = await page.waitForSelector("#internal-test-link")
            await internalLinkElement.click()
            assert.include(await page.title(), "#some-javascript")
        })
    })
})
