const ipc = require("../ipc/ipcMain")
const menu = require("../main/menu")
const storage = require("../main/storage")

const shared = require("./tocShared")

const SHOW_FOR_ALL_DOCS_MENU_ID = "show-for-all-docs"
const SHOW_FOR_THIS_DOC_MENU_ID = "show-for-this-doc"

let _mainMenu
let _applicationSettings
let _info

function update() {
    ipc.send(ipc.messages.updateToc, _info)
}

function determineTocVisibility(documentSettings) {
    return documentSettings.showTocOverridesAppSettings
        ? documentSettings.showToc
        : _applicationSettings.showToc
}

exports.SHOW_FOR_ALL_DOCS_MENU_ID = SHOW_FOR_ALL_DOCS_MENU_ID

exports.SHOW_FOR_THIS_DOC_MENU_ID = SHOW_FOR_THIS_DOC_MENU_ID

exports.init = (mainMenu, applicationSettings) => {
    _mainMenu = mainMenu
    _applicationSettings = applicationSettings
    const documentSettings = storage.loadDocumentSettings()

    _info = {
        isVisible: determineTocVisibility(documentSettings),
        widthPx: applicationSettings.tocWidth ?? shared.WIDTH_DEFAULT_PX,
        collapsedEntries: documentSettings.collapsedTocEntries,
    }
    menu.setChecked(_mainMenu, SHOW_FOR_ALL_DOCS_MENU_ID, applicationSettings.showToc)
    menu.setChecked(_mainMenu, SHOW_FOR_THIS_DOC_MENU_ID, documentSettings.showToc)
    update()

    ipc.listen(ipc.messages.updateToc, tocInfo => {
        documentSettings.collapsedTocEntries = tocInfo.collapsedEntries
        _applicationSettings.tocWidth = tocInfo.widthPx
    })
}

exports.switchVisibilityForApplication = () => {
    _applicationSettings.showToc = menu.getChecked(_mainMenu, SHOW_FOR_ALL_DOCS_MENU_ID)
    _info.isVisible = determineTocVisibility(storage.loadDocumentSettings())
    update()
}

exports.switchVisibilityForDocument = () => {
    const documentSettings = storage.loadDocumentSettings()
    documentSettings.showTocOverridesAppSettings = true
    documentSettings.showToc = menu.getChecked(_mainMenu, SHOW_FOR_THIS_DOC_MENU_ID)
    _info.isVisible = determineTocVisibility(documentSettings)
    update()
}

exports.update = update
