const ipc = require("../ipc/ipcMain")
const menu = require("../main/menu")
const navigation = require("../navigation/navigationMain")
const storage = require("../main/storage")

const SETTINGS_MENU_ID = "settings"

const _excludedApplicationSettings = ["tocWidth"]
const _excludedDocumentSettings = ["encoding", "windowPosition", "collapsedTocEntries"]

let _mainMenu

function filterSettings(settings, excluded) {
    const filtered = {}
    for (const [name, value] of Object.entries(settings)) {
        if (!excluded.includes(name)) {
            filtered[name] = value
        }
    }
    return filtered
}

exports.SETTINGS_MENU_ID = SETTINGS_MENU_ID

exports.init = mainMenu => {
    _mainMenu = mainMenu

    ipc.listen(ipc.messages.settingsDialogIsOpen, isOpen =>
        menu.setEnabled(_mainMenu, SETTINGS_MENU_ID, !isOpen),
    )
    ipc.listen(ipc.messages.applySettings, (applicationSettings, documentSettings) => {
        console.log("applicationSettings", applicationSettings)
        console.log("documentSettings", documentSettings)
    })
}

exports.open = () =>
    ipc.send(
        ipc.messages.settings,
        filterSettings(storage.loadApplicationSettings().toJSON(), _excludedApplicationSettings),
        filterSettings(
            storage.loadDocumentSettings(navigation.getCurrentLocation().filePath).toJSON(),
            _excludedDocumentSettings,
        ),
    )
