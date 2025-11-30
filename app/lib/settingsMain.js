const contentBlocking = require("./contentBlockingMain")
const fileHistory = require("./fileHistoryMain")
const fileLib = require("./file")
const ipc = require("./ipcMain")
const menu = require("./menuMain")
const navigation = require("./navigationMain")
const storage = require("./storageMain")
const toc = require("./tocMain")

const shared = require("./settingsShared")

const SETTINGS_MENU_ID = "settings"

const UPDATE_FILE_SPECIFICA_NAV_ID = "update-file-specific-document-rendering"

let _mainMenu
let _applicationSettings

let _previousFilePath = ""

function isMarkdownFileType(filePath) {
    return _applicationSettings.mdFileTypes.includes(fileLib.extractFileEnding(filePath))
}

function setZoom(zoomFactor) {
    _applicationSettings.zoom = zoomFactor
    ipc.send(ipc.messages.changeZoom, zoomFactor)
}

function notifySettingsChanges(filePath) {
    const documentSettings = storage.loadDocumentSettings(filePath)
    ipc.send(ipc.messages.updateSettings, {
        lineBreaksEnabled: _applicationSettings.lineBreaksEnabled,
        typographyEnabled: _applicationSettings.typographyEnabled,
        emojisEnabled: _applicationSettings.emojisEnabled,
        renderAsMarkdown: documentSettings.renderAsMarkdown || isMarkdownFileType(filePath),
        hideMetadata: _applicationSettings.hideMetadata,
        dragDropBehavior: _applicationSettings.dragDropBehavior,
    })
}

function applySettings(applicationSettingsData, documentSettingsData) {
    for (const [setting, value] of Object.entries(applicationSettingsData)) {
        _applicationSettings[setting] = value
    }

    const documentSettings = storage.loadDocumentSettings()
    for (const [setting, value] of Object.entries(documentSettingsData)) {
        documentSettings[setting] = value
    }

    contentBlocking.setShallBlockContent(_applicationSettings.blockContent)
    setZoom(applicationSettingsData.zoom)
    notifySettingsChanges(navigation.currentFilePath())
    toc.setVisibilityForApplication(_applicationSettings.showToc)
    if (documentSettings.showTocOverridesAppSettings) {
        toc.setVisibilityForDocument(documentSettings.showToc)
    }

    storage.loadFileHistory().updateSize()
    fileHistory.updateMenu()
}

exports.SETTINGS_MENU_ID = SETTINGS_MENU_ID

exports.DISCOURAGE_CLASS = shared.DISCOURAGE_CLASS

exports.WARN_TEXT_CLASS = shared.WARN_TEXT_CLASS

exports.init = (mainMenu, filePath) => {
    _mainMenu = mainMenu
    _applicationSettings = storage.loadApplicationSettings()
    notifySettingsChanges(filePath)

    navigation.register(UPDATE_FILE_SPECIFICA_NAV_ID, () => {
        const filePath = navigation.currentFilePath()
        if (filePath !== _previousFilePath) {
            notifySettingsChanges(filePath)
        }
        _previousFilePath = filePath
    })
    ipc.listen(ipc.messages.settingsDialogIsOpen, isOpen =>
        menu.setEnabled(_mainMenu, SETTINGS_MENU_ID, !isOpen),
    )
    ipc.listen(ipc.messages.applySettings, applySettings)
}

exports.open = () =>
    ipc.send(
        ipc.messages.settings,
        _applicationSettings.toJSON(),
        storage.loadDocumentSettings().toJSON(),
    )

exports.setZoom = setZoom

exports.notifySettingsChanges = notifySettingsChanges
