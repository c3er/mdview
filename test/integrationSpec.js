const path = require("path")

const assert = require("chai").assert
const electronPath = require("electron")
const playwright = require("playwright")

const lib = require("./testLib")
const mocking = require("./mocking")

const toc = require("../app/lib/toc/tocMain")

const electron = playwright._electron

const defaultDocumentFile = "testfile_utf8.md"
const defaultDocumentDir = path.join(__dirname, "documents")
const defaultDocumentPath = path.join(defaultDocumentDir, defaultDocumentFile)

let app
let page

const consoleMessages = []

function clearMessages() {
    consoleMessages.length = 0
}

function addMessage(msg) {
    consoleMessages.push(msg)
}

async function cleanup() {
    clearMessages()
    await lib.removeDataDir()
}

async function startApp(documentPath) {
    const app = await electron.launch({
        args: [path.join(__dirname, ".."), documentPath, "--test", mocking.dataDir],
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

async function clickMenuItem(app, id) {
    app.evaluate(
        ({ Menu }, menuId) => Menu.getApplicationMenu().getMenuItemById(menuId).click(),
        id,
    )
}

async function menuItemIsEnabled(app, id) {
    return await app.evaluate(
        ({ Menu }, menuId) => Menu.getApplicationMenu().getMenuItemById(menuId).enabled,
        id,
    )
}

async function menuItemIsChecked(app, id) {
    return await app.evaluate(
        ({ Menu }, menuId) => Menu.getApplicationMenu().getMenuItemById(menuId).checked,
        id,
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
    before(async () => {
        await cleanup()
        ;[app, page] = await startApp(defaultDocumentPath)
    })

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

    describe('Library "storage"', () => {
        const storage = require("../app/lib/main/storage")

        describe("Application settings", () => {
            let applicationSettings

            beforeEach(() => {
                mocking.resetElectron()
                storage.init(mocking.dataDir, mocking.electron)
                applicationSettings = storage.loadApplicationSettings()
                applicationSettings.theme = mocking.DEFAULT_THEME
            })

            describe("Theme", () => {
                it("has a default theme", () => {
                    assert.strictEqual(applicationSettings.theme, mocking.DEFAULT_THEME)
                })

                it("remembers light theme", () => {
                    const theme = applicationSettings.LIGHT_THEME
                    applicationSettings.theme = theme
                    assert.strictEqual(applicationSettings.theme, theme)
                })

                it("remembers dark theme", () => {
                    const theme = applicationSettings.DARK_THEME
                    applicationSettings.theme = theme
                    assert.strictEqual(applicationSettings.theme, theme)
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
                    const documentSettings = storage.loadDocumentSettings("test1")
                    documentSettings.encoding = ENCODING
                    assert.strictEqual(documentSettings.encoding, ENCODING)
                })

                it("loads default encoding if path is not known", () => {
                    const documentSettings = storage.loadDocumentSettings("unknown-file")
                    assert.strictEqual(documentSettings.encoding, documentSettings.ENCODING_DEFAULT)
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
                        assert.strictEqual(
                            (await searchMenuItem(currentItemPath)).enabled,
                            currentItem.isEnabled,
                        )
                    })

                    const isChecked = currentItem.isChecked ?? false
                    it(`is ${isChecked ? "checked" : "unchecked"}`, async () => {
                        assert.strictEqual(
                            (await searchMenuItem(currentItemPath)).checked,
                            isChecked,
                        )
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

    describe("Table Of Content", () => {
        it("is invisible by default", async () => {
            assert.isTrue(await elementIsHidden(page, mocking.elements.toc.path))
        })
    })

    describe("Separator", () => {
        it("is invisible by default", async () => {
            assert.isTrue(await elementIsHidden(page, mocking.elements.separator.path))
        })
    })

    describe("Raw text", () => {
        it("is invisible", async () => {
            assert.isTrue(await elementIsHidden(page, mocking.elements.rawText.path))
        })
    })
})

describe("Integration tests with their own app instance each", () => {
    async function restartApp() {
        await app.close()
        ;[app, page] = await startApp(defaultDocumentPath)
    }

    beforeEach(async () => {
        await cleanup()
        ;[app, page] = await startApp(defaultDocumentPath)
    })

    afterEach(async () => await app.close())

    describe("Blocked content", () => {
        describe("UI element", () => {
            it("disappears at click on X", async () => {
                const blockedContentArea = mocking.elements.blockedContentArea
                const blockedContentAreaElement = await page.waitForSelector(
                    blockedContentArea.path,
                )
                const blockedContentCloseButtonElement = await page.waitForSelector(
                    blockedContentArea.closeButton.path,
                )

                await blockedContentCloseButtonElement.click()
                assert.isFalse(await blockedContentAreaElement.isVisible())
            })

            it("unblocks content", async () => {
                const blockedContentArea = mocking.elements.blockedContentArea
                const blockedContentAreaElement = await page.waitForSelector(
                    blockedContentArea.path,
                )
                const blockedContentTextContainerElement = await page.waitForSelector(
                    blockedContentArea.textContainer.path,
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

                await clickMenuItem(app, unblockContentMenuId)

                assert.isTrue(await elementIsHidden(page, mocking.elements.blockedContentArea.path))
                assert.isFalse(await menuItemIsEnabled(app, unblockContentMenuId))
                assert.isTrue(hasUnblockedContentMessage())
            })
        })
    })

    describe("Theme switching", () => {
        it("can be done", async () => {
            await clickMenuItem(app, "switch-theme")
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

    describe("Table of Content", () => {
        async function assertTocIsVisible() {
            assert.exists(await page.waitForSelector(mocking.elements.toc.path))
            assert.exists(await page.waitForSelector(mocking.elements.separator.path))
        }

        async function assertMenuItemIsChecked(id, isChecked) {
            assert.strictEqual(await menuItemIsChecked(app, id), isChecked)
        }

        async function assertTocSetting(showTocMenuId) {
            await clickMenuItem(app, showTocMenuId)
            await assertMenuItemIsChecked(showTocMenuId, true)
            await assertTocIsVisible()

            await restartApp()

            await assertTocIsVisible()
            await assertMenuItemIsChecked(showTocMenuId, true)
        }

        it("appears after menu click for all documents", async () => {
            await clickMenuItem(app, toc.SHOW_FOR_ALL_DOCS_MENU_ID)
            await assertMenuItemIsChecked(toc.SHOW_FOR_ALL_DOCS_MENU_ID, true)
            await assertTocIsVisible()
        })

        it("appears after menu click for this document", async () => {
            await clickMenuItem(app, toc.SHOW_FOR_THIS_DOC_MENU_ID)
            await assertMenuItemIsChecked(toc.SHOW_FOR_THIS_DOC_MENU_ID, true)
            assert.isTrue(await menuItemIsEnabled(app, toc.FORGET_DOCUMENT_OVERRIDE_MENU_ID))
            await assertTocIsVisible()
        })

        it("remembers chosen visibility for all documents", async () => {
            await assertTocSetting(toc.SHOW_FOR_ALL_DOCS_MENU_ID)
        })

        it("remembers chosen visibility for this document", async () => {
            await assertTocSetting(toc.SHOW_FOR_THIS_DOC_MENU_ID)
        })
    })

    describe("Separator", () => {
        async function displaySeparator() {
            await clickMenuItem(app, toc.SHOW_FOR_ALL_DOCS_MENU_ID)
            const separatorElement = await page.waitForSelector(mocking.elements.separator.path)
            assert.exists(separatorElement)
            return separatorElement
        }

        async function determineMiddlePosition(element) {
            const box = await element.boundingBox()
            return [box.x + box.width / 2, box.y + box.height / 2]
        }

        async function drag(x, y, xDelta, yDelta) {
            const mouse = page.mouse
            await mouse.move(x, y)
            await mouse.down()
            await mouse.move(x + xDelta, y + yDelta)
            await mouse.up()
        }

        it("can be moved", async () => {
            const separatorElement = await displaySeparator()
            const [origX, y] = await determineMiddlePosition(separatorElement)

            await drag(origX, y, 50, 0)

            separatorBox = await separatorElement.boundingBox()
            assert.isAbove(separatorBox.x, origX)
        })

        it("remembers new position", async () => {
            let separatorElement = await displaySeparator()
            const [origX, y] = await determineMiddlePosition(separatorElement)

            await drag(origX, y, 50, 0)
            const { updatedX } = await separatorElement.boundingBox()

            await restartApp()

            separatorElement = await page.waitForSelector(mocking.elements.separator.path)
            assert.exists(separatorElement)

            const { rememberedX } = await separatorElement.boundingBox()
            assert.strictEqual(rememberedX, updatedX)
        })
    })

    describe("Keyboard handling", () => {
        it("has focus on content", async () => {
            const contentElement = await page.waitForSelector(
                `${mocking.elements.content.path} > p`,
            )

            const orig = await contentElement.boundingBox()
            await page.keyboard.press("PageDown", { delay: 100 })
            const changed = await contentElement.boundingBox()

            assert.strictEqual(changed.x, orig.x)
            assert.notStrictEqual(changed.y, orig.y)
        })
    })
})

describe("Integration tests with special documents", () => {
    it("loads image encoded as data URL", async () => {
        await cleanup()
        ;[app, page] = await startApp(path.join(defaultDocumentDir, "gh-issue23.md"))
        try {
            assert.isFalse(containsConsoleMessage("Failed to load resource"))
        } finally {
            await app.close()
        }
    })
})
