const fileLib = require("../file")
const ipc = require("../ipc/ipcMain")
const menu = require("../main/menu")
const navigation = require("../navigation/navigationMain")
const storage = require("../main/storage")
const toc = require("../toc/tocMain")

const SETTINGS_MENU_ID = "settings"

const UPDATE_FILE_SPECIFICA_NAV_ID = "update-file-specific-document-rendering"

const _excludedApplicationSettings = ["tocWidth"]
const _excludedDocumentSettings = ["encoding", "windowPosition", "collapsedTocEntries"]

let _mainMenu
let _applicationSettings

let _previousFilePath = ""

function filterSettings(settings, excluded) {
    const filtered = {}
    for (const [name, value] of Object.entries(settings)) {
        if (!excluded.includes(name)) {
            filtered[name] = value
        }
    }
    return filtered
}

function isMarkdownFileType(filePath) {
    return _applicationSettings.mdFileTypes.includes(fileLib.extractFileEnding(filePath))
}

function setZoom(zoomFactor) {
    _applicationSettings.zoom = zoomFactor
    ipc.send(ipc.messages.changeZoom, zoomFactor)
}

function notifyRenderingOptionChanges(filePath) {
    const documentSettings = storage.loadDocumentSettings(filePath)
    ipc.send(ipc.messages.changeRenderingOptions, {
        lineBreaksEnabled: _applicationSettings.lineBreaksEnabled,
        typographyEnabled: _applicationSettings.typographyEnabled,
        emojisEnabled: _applicationSettings.emojisEnabled,
        renderAsMarkdown: documentSettings.renderAsMarkdown || isMarkdownFileType(filePath),
        hideMetadata: _applicationSettings.hideMetadata,
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

    setZoom(applicationSettingsData.zoom)
    notifyRenderingOptionChanges(navigation.getCurrentLocation().filePath)
    toc.setVisibilityForApplication(_applicationSettings.showToc)
    if (documentSettings.showTocOverridesAppSettings) {
        toc.setVisibilityForDocument(documentSettings.showToc)
    }
}

exports.SETTINGS_MENU_ID = SETTINGS_MENU_ID

exports.init = (mainMenu, filePath) => {
    _mainMenu = mainMenu
    _applicationSettings = storage.loadApplicationSettings()
    notifyRenderingOptionChanges(filePath)

    navigation.register(UPDATE_FILE_SPECIFICA_NAV_ID, () => {
        const filePath = navigation.getCurrentLocation().filePath
        if (filePath !== _previousFilePath) {
            notifyRenderingOptionChanges(filePath)
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
        filterSettings(_applicationSettings.toJSON(), _excludedApplicationSettings),
        filterSettings(storage.loadDocumentSettings().toJSON(), _excludedDocumentSettings),
    )

exports.setZoom = setZoom
