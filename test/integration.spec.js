const path = require("path")

const assert = require("chai").assert
const electronPath = require("electron")
const playwright = require("playwright")

const lib = require("./testLib")
const mocking = require("./mocking")

const toc = require("../app/lib/toc/tocMain")

const electron = playwright._electron

const DEFAULT_DOCUMENT_FILE = "testfile_without-mermaid.md"
const DEFAULT_DOCUMENT_DIR = path.join(__dirname, "documents")
const DEFAULT_DOCUMENT_PATH = path.join(DEFAULT_DOCUMENT_DIR, DEFAULT_DOCUMENT_FILE)

let _app
let _page

const _consoleMessages = []

function clearMessages() {
    _consoleMessages.length = 0
}

function addMessage(msg) {
    _consoleMessages.push(msg)
}

async function cleanup() {
    _app = _page = null
    clearMessages()
    await lib.removeDataDir()
}

async function waitForWindowLoaded() {
    await _page.locator("#loading-indicator #loaded").waitFor({ state: "attached", timeout: 5000 })
}

async function startApp(documentPath) {
    _app = await electron.launch({
        args: [path.join(__dirname, ".."), documentPath, "--test", mocking.dataDir],
        executablePath: electronPath,
    })

    _page = await _app.firstWindow()
    _page.on("console", msg => addMessage(msg.text()))
    _page.on("crash", () => assert.fail("Crash happened"))
    _page.on("pageerror", error => assert.fail(`Page error: ${error}`))

    const defaultTimeout = 3000
    _page.setDefaultTimeout(defaultTimeout)
    _page.setDefaultNavigationTimeout(defaultTimeout)

    await waitForWindowLoaded()
}

async function restartApp(documentPath) {
    await _app.close()
    await startApp(documentPath ?? DEFAULT_DOCUMENT_PATH)
}

async function clickMenuItem(id) {
    await _app.evaluate(
        ({ Menu }, menuId) => Menu.getApplicationMenu().getMenuItemById(menuId).click(),
        id,
    )
}

async function menuItemIsEnabled(id) {
    return await _app.evaluate(
        ({ Menu }, menuId) => Menu.getApplicationMenu().getMenuItemById(menuId).enabled,
        id,
    )
}

async function menuItemIsChecked(id) {
    return await _app.evaluate(
        ({ Menu }, menuId) => Menu.getApplicationMenu().getMenuItemById(menuId).checked,
        id,
    )
}

function containsConsoleMessage(message) {
    return Boolean(_consoleMessages.find(msg => msg.toLowerCase().includes(message.toLowerCase())))
}

function hasUnblockedContentMessage() {
    return containsConsoleMessage("unblocked")
}

async function elementIsHidden(elementPath) {
    const locator = _page.locator(elementPath)
    await locator.waitFor({ state: "hidden" })
    return await locator.isHidden()
}

describe("Integration tests with single app instance", () => {
    before(async () => {
        await cleanup()
        await startApp(DEFAULT_DOCUMENT_PATH)
    })

    after(async () => await _app.close())

    it("opens a window", () => {
        assert.exists(_page)
    })

    it("has file name in title bar", async () => {
        assert.include(await _page.title(), DEFAULT_DOCUMENT_FILE)
    })

    it("displays blocked content banner", async () => {
        const elem = await _page.$(mocking.elements.blockedContentArea.path)
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
            return await _app.evaluate(({ Menu }, itemPath) => {
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
            for (const [, currentItem] of Object.entries(menu)) {
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
            assert.isTrue(await elementIsHidden(mocking.elements.toc.path))
        })
    })

    describe("Separator", () => {
        it("is invisible by default", async () => {
            assert.isTrue(await elementIsHidden(mocking.elements.separator.path))
        })
    })

    describe("Raw text", () => {
        it("is invisible", async () => {
            assert.isTrue(await elementIsHidden(mocking.elements.rawText.path))
        })
    })
})

describe("Integration tests with their own app instance each", () => {
    async function assertErrorDialog() {
        const errorDialog = mocking.elements.errorDialog

        assert.isTrue(await _page.locator(errorDialog.path).isVisible())

        await _page.locator(errorDialog.okButton.path).click()
        assert.isTrue(await elementIsHidden(errorDialog.path))
    }

    beforeEach(async () => {
        await cleanup()
        await startApp(DEFAULT_DOCUMENT_PATH)
    })

    afterEach(async () => await _app.close())

    describe("Blocked content", () => {
        describe("UI element", () => {
            it("disappears at click on X", async () => {
                const blockedContentArea = mocking.elements.blockedContentArea

                await _page.locator(blockedContentArea.closeButton.path).click()
                assert.isTrue(await elementIsHidden(blockedContentArea.path))
            })

            it("unblocks content", async () => {
                const blockedContentArea = mocking.elements.blockedContentArea

                await _page.locator(blockedContentArea.textContainer.path).click()
                assert.isTrue(await elementIsHidden(blockedContentArea.path))
                assert.isTrue(hasUnblockedContentMessage())
            })
        })

        describe("Menu item", () => {
            it("unblocks content", async () => {
                const contentBlocking = require("../app/lib/contentBlocking/contentBlockingMain")
                const unblockContentMenuId = contentBlocking.UNBLOCK_CONTENT_MENU_ID

                await clickMenuItem(unblockContentMenuId)

                assert.isTrue(await elementIsHidden(mocking.elements.blockedContentArea.path))
                assert.isFalse(await menuItemIsEnabled(unblockContentMenuId))
                assert.isTrue(hasUnblockedContentMessage())
            })
        })
    })

    describe("Theme switching", () => {
        it("can be done", async () => {
            for (const themeEntry of ["system-theme", "light-theme", "dark-theme"]) {
                await clickMenuItem(themeEntry)
                assert.isFalse(containsConsoleMessage("error"))
            }
        })
    })

    describe("Links in document", () => {
        it("changes title after click", async () => {
            await _page.locator("#internal-test-link").click()
            waitForWindowLoaded()
            assert.include(await _page.title(), "#some-javascript")
        })
    })

    describe("Table of Content", () => {
        async function assertTocIsVisible() {
            const tocLocator = _page.locator(mocking.elements.toc.path)
            await tocLocator.waitFor()
            assert.isTrue(await tocLocator.isVisible())

            const separatorLocator = _page.locator(mocking.elements.separator.path)
            await separatorLocator.waitFor()
            assert.isTrue(await separatorLocator.isVisible())
        }

        async function assertMenuItemIsChecked(id, isChecked) {
            assert.strictEqual(await menuItemIsChecked(id), isChecked)
        }

        async function assertTocSetting(showTocMenuId) {
            await clickMenuItem(showTocMenuId)
            await assertMenuItemIsChecked(showTocMenuId, true)
            await assertTocIsVisible()

            await restartApp()

            await assertTocIsVisible()
            await assertMenuItemIsChecked(showTocMenuId, true)
        }

        it("appears after menu click for all documents", async () => {
            await clickMenuItem(toc.SHOW_FOR_ALL_DOCS_MENU_ID)
            await assertMenuItemIsChecked(toc.SHOW_FOR_ALL_DOCS_MENU_ID, true)
            await assertTocIsVisible()
        })

        it("appears after menu click for this document", async () => {
            await clickMenuItem(toc.SHOW_FOR_THIS_DOC_MENU_ID)
            await assertMenuItemIsChecked(toc.SHOW_FOR_THIS_DOC_MENU_ID, true)
            assert.isTrue(await menuItemIsEnabled(toc.FORGET_DOCUMENT_OVERRIDE_MENU_ID))
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
        const DRAG_DISTANCE = 50

        async function displaySeparator() {
            await clickMenuItem(toc.SHOW_FOR_ALL_DOCS_MENU_ID)
            const separatorLocator = _page.locator(mocking.elements.separator.path)
            assert.isTrue(await separatorLocator.isVisible())
            return separatorLocator
        }

        async function determineMiddlePosition(element) {
            const box = await element.boundingBox()
            return [box.x + box.width / 2, box.y + box.height / 2]
        }

        async function drag(x, y, xDelta, yDelta) {
            const mouse = _page.mouse
            await mouse.move(x, y)
            await mouse.down()
            await mouse.move(x + xDelta, y + yDelta)
            await mouse.up()
        }

        it("can be moved", async () => {
            const separatorLocator = await displaySeparator()
            const [origX, y] = await determineMiddlePosition(separatorLocator)

            await drag(origX, y, DRAG_DISTANCE, 0)

            const separatorBox = await separatorLocator.boundingBox()
            assert.isAbove(separatorBox.x, origX)
        })

        it("remembers new position", async () => {
            let separatorLocator = await displaySeparator()
            const [origX, y] = await determineMiddlePosition(separatorLocator)

            await drag(origX, y, DRAG_DISTANCE, 0)
            const { updatedX } = await separatorLocator.boundingBox()

            await restartApp()

            separatorLocator = _page.locator(mocking.elements.separator.path)
            assert.isTrue(await separatorLocator.isVisible())

            const { rememberedX } = await separatorLocator.boundingBox()
            assert.strictEqual(rememberedX, updatedX)
        })
    })

    describe("Search dialog", () => {
        const search = require("../app/lib/search/searchMain")

        const searchResultClass = `class="${search.SEARCH_RESULT_CLASS}"`
        const selectedSearchResultId = `id="${search.SELECTED_SEARCH_RESULT_ID}"`

        async function assertDialogIsClosed() {
            assert.isTrue(await elementIsHidden(mocking.elements.searchDialog.path))
        }

        async function opendDialog() {
            await clickMenuItem(search.FIND_MENU_ID)
            assert.isTrue(await _page.locator(mocking.elements.searchDialog.path).isVisible())
        }

        async function confirmDialog() {
            await _page.locator(mocking.elements.searchDialog.okButton.path).click()
            await assertDialogIsClosed()
        }

        async function getContent() {
            return await _page.locator(mocking.elements.content.path).innerHTML()
        }

        async function enterSearchTerm(term) {
            await _page.locator(mocking.elements.searchDialog.inputField.path).fill(term)
        }

        it("can be canceled", async () => {
            await opendDialog()
            await _page.locator(mocking.elements.searchDialog.cancelButton.path).click()
            await assertDialogIsClosed()
        })

        it("changes nothing after confirming without input", async () => {
            await opendDialog()
            await confirmDialog()

            const content = await getContent()
            assert.notInclude(content, searchResultClass)
            assert.notInclude(content, selectedSearchResultId)
        })

        it("highlights and scrolls to search term", async () => {
            // It would be cleaner, if this were two tests, but every integration test takes
            // quite some time.

            const contentLocator = _page.locator(
                `${mocking.elements.content.path} > p:first-of-type`,
            )
            const orig = await contentLocator.boundingBox()

            await opendDialog()
            await enterSearchTerm("multi markdown table")
            await confirmDialog()
            await _page.locator(`#${search.SELECTED_SEARCH_RESULT_ID}`).waitFor()

            const content = await getContent()
            assert.include(content, searchResultClass)
            assert.include(content, selectedSearchResultId)

            const changed = await contentLocator.boundingBox()
            assert.strictEqual(changed.x, orig.x)
            assert.notStrictEqual(changed.y, orig.y)
        })
    })

    describe("Error dialog", () => {
        const error = require("../app/lib/error/errorMain")

        it("is displayed and can be closed", async () => {
            await clickMenuItem(error.SHOW_ERROR_MENU_ID)
            await assertErrorDialog()
        })
    })

    describe("Keyboard handling", () => {
        it("has focus on content", async () => {
            const contentLocator = _page.locator(
                `${mocking.elements.content.path} > p:first-of-type`,
            )

            const orig = await contentLocator.boundingBox()
            await _page.keyboard.press("PageDown", { delay: 100 })
            const changed = await contentLocator.boundingBox()

            assert.strictEqual(changed.x, orig.x)
            assert.notStrictEqual(changed.y, orig.y)
        })
    })

    describe("Drag & drop", () => {
        async function drop(filePath) {
            // The already defined event in the mocking module cannot be used here.
            // The "evaluateHandle" function serializes the parameters and an object containing
            // a function cannot be serialized.
            await _page.evaluateHandle(filePath => {
                // eslint-disable-next-line no-undef
                dropHandler({
                    preventDefault() {},
                    dataTransfer: {
                        files: [{ path: filePath }],
                    },
                })
            }, filePath)

            await waitForWindowLoaded()
        }

        it("can be done", async () => {
            const filePathToDrop = path.join(DEFAULT_DOCUMENT_DIR, "languages.md")
            await drop(filePathToDrop)
            assert.include(await _page.title(), filePathToDrop)
        })

        it("doesn't crash after dropping a directory", async () => {
            await drop(DEFAULT_DOCUMENT_DIR)
            await assertErrorDialog()
        })

        it("doesn't try to load a binary file", async () => {
            const imageFilePath = path.join(DEFAULT_DOCUMENT_DIR, "images", "image.png")
            await drop(imageFilePath)
            await assertErrorDialog()
            assert.notInclude(await _page.title(), imageFilePath)
        })
    })
})

describe("Integration tests with special documents", () => {
    async function testWithDocument(documentPath, callback) {
        await cleanup()
        await startApp(documentPath)
        try {
            await callback()
        } finally {
            await _app?.close()
        }
    }

    it("loads image encoded as data URL", async () => {
        await testWithDocument(path.join(DEFAULT_DOCUMENT_DIR, "gh-issue23.md"), () =>
            assert.isFalse(containsConsoleMessage("Failed to load resource")),
        )
    })

    describe("Metadata", () => {
        const documentRendering = require("../app/lib/documentRendering/documentRenderingMain")

        const documentPath = path.join(DEFAULT_DOCUMENT_DIR, "metadata.md")

        it("renders by default", async () => {
            await testWithDocument(documentPath, async () =>
                assert.strictEqual(
                    (await _page.locator("//*/p/strong").allInnerTexts())[0],
                    "Metadata",
                ),
            )
        })

        it("can be hidden", async () => {
            await testWithDocument(documentPath, async () => {
                await clickMenuItem(documentRendering.HIDE_METADATA_MENU_ID)
                await restartApp(documentPath)
                assert.isFalse(
                    (await _page.locator("//*/p/strong").allInnerTexts()).includes("Metadata"),
                )
            })
        })
    })
})
