const ipc = require("../ipcMain")
const menu = require("./menu")
const navigation = require("../navigationMain")
const storage = require("./storage")

let electron

const RECENT_FILES_MENU_ID = "recent-files"
const REMOVE_RECENT_FILES_MENU_ID = "remove-recent-files"
const ADD_TO_FILE_HISTORY_NAV_ID = "add-to-file-history"

let _mainMenu

function updateMenu() {
    const fileHistory = storage.loadFileHistory()
    const subMenu = _mainMenu.getMenuItemById(RECENT_FILES_MENU_ID).submenu

    // Workaround: it is not easily possible to remove existing menu items.
    // Instead, make all menu items invisible and add the updated file history list to the menu.
    for (const menuItem of subMenu.items) {
        menuItem.visible = false
    }
    for (const filePath of fileHistory.filePaths) {
        subMenu.append(
            new electron.MenuItem({
                label: filePath,
                click() {
                    navigation.go(filePath)
                },
            }),
        )
    }

    menu.setEnabled(_mainMenu, REMOVE_RECENT_FILES_MENU_ID, fileHistory.hasFiles())

    // Additional workaround for macOS
    electron.Menu.setApplicationMenu(_mainMenu)
}

function addFile(filePath) {
    storage.loadFileHistory().add(filePath)
    updateMenu()
}

function clear() {
    storage.loadFileHistory().clear()
    updateMenu()
}

exports.RECENT_FILES_MENU_ID = RECENT_FILES_MENU_ID

exports.REMOVE_RECENT_FILES_MENU_ID = REMOVE_RECENT_FILES_MENU_ID

exports.init = (mainMenu, initialFilePath, electronMock) => {
    _mainMenu = mainMenu
    electron = electronMock ?? require("electron")

    addFile(initialFilePath)

    navigation.register(ADD_TO_FILE_HISTORY_NAV_ID, () => addFile(navigation.currentFilePath()))
    ipc.listen(ipc.messages.clearFileHistory, clear)
}

exports.clear = clear

exports.updateMenu = updateMenu
