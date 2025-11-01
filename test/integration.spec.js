const assert = require("assert")
const path = require("path")

const electronPath = require("electron")
const playwright = require("playwright")

const lib = require("./testLib")
const mocking = require("./mocking")

const common = require("../app/lib/common")
const settings = require("../app/lib/settingsMain")
const storage = require("../app/lib/storageMain")
const toc = require("../app/lib/tocMain")

const electron = playwright._electron

const DEFAULT_TIMEOUT = 3000

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

async function initPage() {
    _page = await _app.firstWindow()
    _page.on("console", msg => addMessage(msg.text()))
    _page.on("crash", () => assert.fail("Crash happened"))
    _page.on("pageerror", error => assert.fail(`Page error: ${error.stack}`))

    _page.setDefaultTimeout(DEFAULT_TIMEOUT)
    _page.setDefaultNavigationTimeout(DEFAULT_TIMEOUT)

    await waitForWindowLoaded()
}

async function startApp(documentPath) {
    _app = await electron.launch({
        args: [path.join(__dirname, ".."), documentPath, "--test", mocking.dataDir],
        executablePath: electronPath,
    })
    _app.context().setDefaultTimeout(DEFAULT_TIMEOUT)
    await initPage()
}

async function restartApp(documentPath) {
    await _app.close()
    await startApp(documentPath ?? lib.DEFAULT_DOCUMENT_PATH)
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

async function elementHasState(elementPath, state, locatorCallback) {
    const attempts = 3
    for (let i = 0; i < attempts; i++) {
        const locator = _page.locator(elementPath)
        await locator.waitFor({ state: state })
        if (await locatorCallback(locator)) {
            return true
        }
    }
    return false
}

async function elementIsHidden(elementPath) {
    return await elementHasState(elementPath, "hidden", async locator => await locator.isHidden())
}

async function elementIsVisible(elementPath) {
    return await elementHasState(elementPath, "visible", async locator => await locator.isVisible())
}

describe("Integration tests with single app instance", () => {
    before(async () => {
        await cleanup()
        await startApp(lib.DEFAULT_DOCUMENT_PATH)
    })

    after(async () => await _app.close())

    it("opens a window", () => {
        assert(Boolean(_page))
    })

    it("has file name in title bar", async () => {
        assert((await _page.title()).includes(lib.DEFAULT_DOCUMENT_FILE))
    })

    it("displays blocked content banner", async () => {
        assert(await elementIsVisible(mocking.elements.blockedContentArea.path))
    })

    it("loads all local images", () => {
        assert(!containsConsoleMessage("ERR_FILE_NOT_FOUND"))
    })

    describe('Library "storage"', () => {
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
            return await _app.evaluate((electron, itemPath) => {
                let menu = electron.Menu.getApplicationMenu()
                let item
                for (const label of itemPath) {
                    item = menu.items.find(item => item.label === label)
                    menu = item.submenu
                }
                return {
                    label: item.label, // For debugging
                    enabled: item.enabled ?? true,
                    checked: item.checked,
                }
            }, menuItemPath)
        }

        function assertMenu(menu, itemPath) {
            for (const currentItem of Object.values(menu)) {
                if (common.isEmptyObject(currentItem)) {
                    continue
                }
                const currentItemLabel = currentItem.label
                const currentItemPath = [...itemPath, currentItemLabel]
                describe(`Menu item "${currentItemLabel}"`, () => {
                    it("exists", async () => {
                        assert(Boolean(await searchMenuItem(currentItemPath)))
                    })

                    const isEnabled = currentItem.isEnabled ?? true
                    it(`is ${isEnabled ? "enabled" : "disabled"}`, async () => {
                        assert.strictEqual(
                            (await searchMenuItem(currentItemPath)).enabled,
                            isEnabled,
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
            assert(await elementIsHidden(mocking.elements.toc.path))
        })
    })

    describe("Separator", () => {
        it("is invisible by default", async () => {
            assert(await elementIsHidden(mocking.elements.separator.path))
        })
    })

    describe("Raw text", () => {
        it("is invisible", async () => {
            assert(await elementIsHidden(mocking.elements.rawText.path))
        })
    })
})

describe("Integration tests with their own app instance each", () => {
    async function assertErrorDialog(text) {
        const errorDialog = mocking.elements.errorDialog

        assert(await elementIsVisible(errorDialog.path))
        assert((await _page.locator(errorDialog.content.path).innerText()).includes(text))

        await _page.locator(errorDialog.okButton.path).click()
        assert(await elementIsHidden(errorDialog.path))
    }

    beforeEach(async () => {
        await cleanup()
        await startApp(lib.DEFAULT_DOCUMENT_PATH)
    })

    afterEach(async () => await _app.close())

    describe("Content blocking", () => {
        const contentBlocking = require("../app/lib/contentBlockingMain")

        describe("UI element", () => {
            it("disappears at click on X", async () => {
                const blockedContentArea = mocking.elements.blockedContentArea

                await _page.locator(blockedContentArea.closeButton.path).click()
                assert(await elementIsHidden(blockedContentArea.path))
            })
        })

        describe("Menu item", () => {
            it("unblocks content", async () => {
                const unblockContentTemporaryMenuId =
                    contentBlocking.UNBLOCK_CONTENT_TEMPORARY_MENU_ID

                await clickMenuItem(unblockContentTemporaryMenuId)

                assert(await elementIsHidden(mocking.elements.blockedContentArea.path))
                assert(!(await menuItemIsEnabled(unblockContentTemporaryMenuId)))
                assert(containsConsoleMessage("unblocked"))
            })
        })

        describe("Dialog and storage", () => {
            // Parts of the UI must stay untested for now, because it is not possible to click on
            // (or react to) popup menus.
            // See https://github.com/microsoft/playwright/issues/11100

            async function openDialog() {
                const dialogPath = mocking.elements.contentBlockingDialog.path
                await clickMenuItem(contentBlocking.UNBLOCK_CONTENT_PERMANENTLY_MENU_ID)
                assert(await elementIsVisible(dialogPath))
                return _page.locator(dialogPath)
            }

            async function collectContents(dialog) {
                const rows = dialog.locator("tr:has(td)")
                const contents = []
                const rowCount = await rows.count()
                for (let i = 0; i < rowCount; i++) {
                    const cells = rows.nth(i).locator("td")
                    contents.push({
                        checkbox: cells.nth(0).locator('input[type="checkbox"]'),
                        url: await cells.nth(1).innerText(),
                    })
                }
                return contents
            }

            beforeEach(() => {
                mocking.resetElectron()
                storage.init(mocking.dataDir, mocking.electron)
            })

            it("unblocks content selectively", async () => {
                const EXPECTED_CONTENT_COUNT = 3
                const EXPECTED_BLOCKED_CONTENT = 1

                const dialog = await openDialog()
                const contents = await collectContents(dialog)
                assert.strictEqual(contents.length, EXPECTED_CONTENT_COUNT)

                const firstContent = contents[0]
                await firstContent.checkbox.click()
                await _page.locator(mocking.elements.contentBlockingDialog.okButton.path).click()
                assert(containsConsoleMessage(`Unblocked: URL: ${firstContent.url}`))

                const storedContents = storage.loadContentBlocking().contents
                assert.strictEqual(storedContents.length, EXPECTED_BLOCKED_CONTENT)

                const firstStoredContent = storedContents[0]
                assert(!firstStoredContent.isBlocked)
                assert.strictEqual(firstStoredContent.url, firstContent.url)
                assert(firstStoredContent.documents.has(lib.DEFAULT_DOCUMENT_PATH))
            })
        })
    })

    describe("Links in document", () => {
        it("changes title after click", async () => {
            await _page.locator("#internal-test-link").click()
            await waitForWindowLoaded()
            assert((await _page.title()).includes("#some-javascript"))
        })

        it("shows error message after click to non existing file", async () => {
            await _page.getByText("Broken external link", { exact: true }).click()
            await assertErrorDialog("does not exist")
        })
    })

    describe("Table of Content", () => {
        async function assertTocIsVisible() {
            assert(await elementIsVisible(mocking.elements.toc.path))
            assert(await elementIsVisible(mocking.elements.separator.path))
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
            assert(await menuItemIsEnabled(toc.FORGET_DOCUMENT_OVERRIDE_MENU_ID))
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
            assert(await elementIsVisible(mocking.elements.toc.path))
            return _page.locator(mocking.elements.separator.path)
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
            assert(separatorBox.x > origX)
        })

        it("remembers new position", async () => {
            let separatorLocator = await displaySeparator()
            const [origX, y] = await determineMiddlePosition(separatorLocator)

            await drag(origX, y, DRAG_DISTANCE, 0)
            const { updatedX } = await separatorLocator.boundingBox()

            await restartApp()
            assert(await elementIsVisible(mocking.elements.separator.path))

            separatorLocator = await _page.locator(mocking.elements.separator.path)
            const { rememberedX } = await separatorLocator.boundingBox()
            assert.strictEqual(rememberedX, updatedX)
        })
    })

    describe("Search dialog", () => {
        const search = require("../app/lib/searchMain")

        const searchResultClass = `class="${search.SEARCH_RESULT_CLASS}"`
        const selectedSearchResultId = `id="${search.SELECTED_SEARCH_RESULT_ID}"`

        async function assertDialogIsClosed() {
            assert(await elementIsHidden(mocking.elements.searchDialog.path))
        }

        async function opendDialog() {
            await clickMenuItem(search.FIND_MENU_ID)
            assert(await elementIsVisible(mocking.elements.searchDialog.path))
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
            assert(!content.includes(searchResultClass))
            assert(!content.includes(selectedSearchResultId))
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
            assert(content.includes(searchResultClass))
            assert(content.includes(selectedSearchResultId))

            const changed = await contentLocator.boundingBox()
            assert.strictEqual(changed.x, orig.x)
            assert.notStrictEqual(changed.y, orig.y)
        })
    })

    describe("Settings dialog", () => {
        const settings = require("../app/lib/settingsMain")

        async function opendDialog() {
            await clickMenuItem(settings.SETTINGS_MENU_ID)
            assert(await elementIsVisible(mocking.elements.settingsDialog.path))
            assert(!(await menuItemIsEnabled(settings.SETTINGS_MENU_ID)))
        }

        async function assertDialogIsClosed() {
            assert(await elementIsHidden(mocking.elements.settingsDialog.path))
            assert(await menuItemIsEnabled(settings.SETTINGS_MENU_ID))
        }

        async function confirmDialog() {
            await _page.locator(mocking.elements.settingsDialog.okButton.path).click()
            await assertDialogIsClosed()
        }

        async function changeToDocumentSettings() {
            const settingsDialogMock = mocking.elements.settingsDialog
            await _page.locator(settingsDialogMock.documentSettingsTab.path).click()
            assert(await elementIsHidden(settingsDialogMock.applicationSettings.path))
            assert(await elementIsVisible(settingsDialogMock.documentSettings.path))
        }

        it("can be opened", async () => {
            await opendDialog()
            await confirmDialog()
        })

        it("has one selected tab", async () => {
            await opendDialog()
            const tabLocators = await _page.locator(".dialog-tab").all()
            let unselectedTabCount = 0
            for (const tabLocator of tabLocators) {
                unselectedTabCount += await tabLocator.evaluate(tabElement =>
                    tabElement.classList.contains("unselected-tab") ? 1 : 0,
                )
            }
            assert.strictEqual(tabLocators.length - unselectedTabCount, 1)
        })

        it("remembers a changed setting", async () => {
            const settingsDialogMock = mocking.elements.settingsDialog

            await opendDialog()
            await changeToDocumentSettings()

            const renderFileAsMarkdownCheckboxLocator = _page.locator(
                settingsDialogMock.documentSettings.renderFileAsMarkdownCheckbox.path,
            )
            const rendersFileAsMarkdown = await renderFileAsMarkdownCheckboxLocator.isChecked()
            await renderFileAsMarkdownCheckboxLocator.click()
            assert.notStrictEqual(
                await renderFileAsMarkdownCheckboxLocator.isChecked(),
                rendersFileAsMarkdown,
            )

            await confirmDialog()
            await restartApp()
            await opendDialog()
            await changeToDocumentSettings()

            assert.notStrictEqual(
                await _page
                    .locator(settingsDialogMock.documentSettings.renderFileAsMarkdownCheckbox.path)
                    .isChecked(),
                rendersFileAsMarkdown,
            )
        })

        it("switches theme", async () => {
            const settingsDialogMock = mocking.elements.settingsDialog
            const applicationSettingsMock = settingsDialogMock.applicationSettings
            const applyButtonLocator = _page.locator(settingsDialogMock.applyButton.path)

            await clickMenuItem(settings.SETTINGS_MENU_ID)

            for (const themeRadioButtonId of [
                applicationSettingsMock.systemThemeRadioButton.path,
                applicationSettingsMock.lightThemeRadioButton.path,
                applicationSettingsMock.darkThemeRadioButton.path,
            ]) {
                await _page.locator(themeRadioButtonId).click()
                await applyButtonLocator.click()
                assert(!containsConsoleMessage("error"))
            }
        })
    })

    describe("About dialog", () => {
        const about = require("../app/lib/aboutMain")

        it("is displayed, copies info to clipboard and can be closed", async () => {
            await clickMenuItem(about.ABOUT_DIALOG_MENU_ID)

            const aboutDialog = mocking.elements.aboutDialog
            assert(await elementIsVisible(aboutDialog.path))

            const clipboard = (await import("clipboardy")).default
            await clipboard.write("")
            await _page.locator(aboutDialog.copyInfoButton.path).click()

            const aboutInfo = JSON.parse(await clipboard.read())
            assert(!Boolean(aboutInfo.applicationIconPath))
            assert(Boolean(aboutInfo.applicationName))
            assert(Boolean(aboutInfo.applicationDescription))
            assert(Boolean(aboutInfo.applicationVersion))
            assert(Boolean(aboutInfo.homepage))
            assert(Boolean(aboutInfo.issueLink))
            assert(Boolean(aboutInfo.frameworkVersions))

            await _page.locator(aboutDialog.okButton.path).click()
            assert(await elementIsHidden(aboutDialog.path))
        })
    })

    describe("Error dialog", () => {
        const error = require("../app/lib/errorMain")

        it("is displayed and can be closed", async () => {
            await clickMenuItem(error.SHOW_ERROR_MENU_ID)
            await assertErrorDialog("error")
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
        const filePathToDrop = path.join(lib.DEFAULT_DOCUMENT_DIR, "languages.md")

        async function drop(filePath) {
            // The already defined event in the mocking module cannot be used here.
            // The "evaluateHandle" function serializes the parameters and an object containing
            // a function cannot be serialized.
            await _page.evaluateHandle(filePath => {
                require("./lib/dragDropRenderer").dropHandler({
                    preventDefault() {},
                    dataTransfer: {
                        files: [{ path: filePath }],
                    },
                })
            }, filePath)

            await waitForWindowLoaded()
        }

        async function clickCurrentWindowButton() {
            await _page
                .locator(mocking.elements.dragDropDialog.openInCurrentWindowButton.path)
                .click()
        }

        it("can be done", async () => {
            await drop(filePathToDrop)
            await clickCurrentWindowButton()
            assert((await _page.title()).includes(filePathToDrop))
        })

        it("doesn't crash after dropping a directory", async () => {
            await drop(lib.DEFAULT_DOCUMENT_DIR)
            await assertErrorDialog("directory")
        })

        it("doesn't try to load a binary file", async () => {
            const imageFilePath = path.join(lib.DEFAULT_DOCUMENT_DIR, "images", "image.png")
            await drop(imageFilePath)
            await assertErrorDialog("not a text file")
            assert(!(await _page.title()).includes(imageFilePath))
        })

        it('rmembers choice after click on "Don\'t ask again" button', async () => {
            await drop(filePathToDrop)
            await _page.locator(mocking.elements.dragDropDialog.dontAskAgainCheckbox.path).click()
            await clickCurrentWindowButton()
            assert((await _page.title()).includes(filePathToDrop))

            await restartApp()

            await drop(filePathToDrop)
            assert((await _page.title()).includes(filePathToDrop))
        })
    })

    describe("Recent files list", () => {
        const fileHistory = require("../app/lib/fileHistoryMain")

        async function subMenuItems(id) {
            return await _app.evaluate(
                (electron, id) =>
                    electron.Menu.getApplicationMenu()
                        .getMenuItemById(id)
                        .submenu.items.filter(item => item.visible)
                        .map(item => item.label),
                id,
            )
        }

        it("contains the currently opened document after cearing the list", async () => {
            await clickMenuItem(fileHistory.REMOVE_RECENT_FILES_MENU_ID)
            assert.deepEqual(await subMenuItems(fileHistory.RECENT_FILES_MENU_ID), [
                lib.DEFAULT_DOCUMENT_PATH,
            ])
        })

        it("contains multiple entries", async () => {
            const filePaths = [
                "metadata.md",
                "languages.md",
                "many-headers1.md",
                "many-headers2.md",
            ].map(file => path.join(lib.DEFAULT_DOCUMENT_DIR, file))
            for (const filePath of filePaths) {
                await restartApp(filePath)
            }
            assert.deepEqual(
                await subMenuItems(fileHistory.RECENT_FILES_MENU_ID),
                filePaths.reverse().concat([lib.DEFAULT_DOCUMENT_PATH]),
            )
        })
    })

    describe("Refresh", () => {
        it("stays in same document", async () => {
            await _page.getByText("Link to README.md", { exact: true }).click()
            assert((await _page.title()).includes("README.md"))

            await clickMenuItem("refresh")
            await initPage()
            assert((await _page.title()).includes("README.md"))
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
        await testWithDocument(path.join(lib.DEFAULT_DOCUMENT_DIR, "gh-issue23.md"), () =>
            assert(!containsConsoleMessage("Failed to load resource")),
        )
    })

    describe("Metadata", () => {
        const documentPath = path.join(lib.DEFAULT_DOCUMENT_DIR, "metadata.md")

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
                const settingsDialogMock = mocking.elements.settingsDialog

                await clickMenuItem(settings.SETTINGS_MENU_ID)
                await _page
                    .locator(settingsDialogMock.applicationSettings.hideMetadataCheckbox.path)
                    .click()
                await _page.locator(settingsDialogMock.okButton.path).click()

                await restartApp(documentPath)
                assert(!(await _page.locator("//*/p/strong").allInnerTexts()).includes("Metadata"))
            })
        })
    })
})
