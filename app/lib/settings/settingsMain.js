const fileLib = require("../file")
const ipc = require("../ipc/ipcMain")
const menu = require("../main/menu")
const navigation = require("../navigation/navigationMain")
const storage = require("../main/storage")
const toc = require("../toc/tocMain")

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

function isMarkdownFileType(applicationSettings, filePath) {
    return applicationSettings.mdFileTypes.includes(fileLib.extractFileEnding(filePath))
}

function setZoom(applicationSettings, zoomFactor) {
    applicationSettings.zoom = zoomFactor
    ipc.send(ipc.messages.changeZoom, zoomFactor)
}

function notifyRenderingOptionChanges(applicationSettings, documentSettings) {
    ipc.send(ipc.messages.changeRenderingOptions, {
        lineBreaksEnabled: applicationSettings.lineBreaksEnabled,
        typographyEnabled: applicationSettings.typographyEnabled,
        emojisEnabled: applicationSettings.emojisEnabled,
        renderAsMarkdown:
            documentSettings.renderAsMarkdown ||
            isMarkdownFileType(applicationSettings, navigation.getCurrentLocation().filePath),
        hideMetadata: applicationSettings.hideMetadata,
    })
}

function applySettings(applicationSettingsData, documentSettingsData) {
    const applicationSettings = storage.loadApplicationSettings()
    for (const [setting, value] of Object.entries(applicationSettingsData)) {
        applicationSettings[setting] = value
    }

    const filePath = navigation.getCurrentLocation().filePath
    const documentSettings = storage.loadDocumentSettings(filePath)
    for (const [setting, value] of Object.entries(documentSettingsData)) {
        documentSettings[setting] = value
    }

    setZoom(applicationSettings, applicationSettingsData.zoom)
    notifyRenderingOptionChanges(applicationSettings, documentSettings)
    toc.setVisibilityForApplication(applicationSettings.showToc)
    if (documentSettings.showTocOverridesAppSettings) {
        toc.setVisibilityForDocument(documentSettings.showToc)
    }
}

exports.SETTINGS_MENU_ID = SETTINGS_MENU_ID

exports.init = mainMenu => {
    _mainMenu = mainMenu

    ipc.listen(ipc.messages.settingsDialogIsOpen, isOpen =>
        menu.setEnabled(_mainMenu, SETTINGS_MENU_ID, !isOpen),
    )
    ipc.listen(ipc.messages.applySettings, applySettings)
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

exports.setZoom = setZoom
