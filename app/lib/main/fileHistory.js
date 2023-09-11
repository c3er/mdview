const menu = require("./menu")
const navigation = require("../navigation/navigationMain")
const storage = require("./storage")

let electron

const RECENT_FILES_MENU_ID = "recent-files"
const REMOVE_RECENT_FILES_MENU_ID = "remove-recent-files"
const ADD_TO_FILE_HISTORY_NAV_ID = "add-to-file-history"

let _mainMenu

function updateMenu() {
    // XXX Not working currently
    const fileHistory = storage.loadFileHistory()
    const subMenu = _mainMenu.getMenuItemById(RECENT_FILES_MENU_ID).submenu
    subMenu.items.length = 0
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
}

function addFile(filePath) {
    storage.loadFileHistory().add(filePath)
    updateMenu()
}

exports.RECENT_FILES_MENU_ID = RECENT_FILES_MENU_ID

exports.REMOVE_RECENT_FILES_MENU_ID = REMOVE_RECENT_FILES_MENU_ID

exports.init = (mainMenu, initialFilePath, electronMock) => {
    _mainMenu = mainMenu
    electron = electronMock ?? require("electron")

    addFile(initialFilePath)

    navigation.register(ADD_TO_FILE_HISTORY_NAV_ID, () =>
        addFile(navigation.getCurrentLocation().filePath),
    )
}

exports.clear = () => {
    storage.loadFileHistory().clear()
    updateMenu()
}
