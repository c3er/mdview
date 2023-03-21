const ipc = require("../ipc/ipcMain")
const mainMenu = require("../main/mainMenu")
const storage = require("../main/storage")

const shared = require("./tocShared")

const SHOW_FOR_ALL_DOCS_MENU_ID = "show-for-all-docs"
const SHOW_FOR_THIS_DOC_MENU_ID = "show-for-this-doc"

let _mainMenu
let _applicationSettings
let _info

exports.SHOW_FOR_ALL_DOCS_MENU_ID = SHOW_FOR_ALL_DOCS_MENU_ID

exports.SHOW_FOR_THIS_DOC_MENU_ID = SHOW_FOR_THIS_DOC_MENU_ID

exports.init = (mainMenuObj, applicationSettings) => {
    _mainMenu = mainMenuObj
    _applicationSettings = applicationSettings
    const documentSettings = storage.loadDocumentSettings()

    const showTocForAllDocs = applicationSettings.showToc
    const showTocForThisDoc =
        documentSettings.showTocOverridesAppSettings && documentSettings.showToc
    _info = {
        isVisible: showTocForAllDocs || showTocForThisDoc,
        widthPx: applicationSettings.tocWidth ?? shared.WIDTH_DEFAULT_PX,
        collapsedEntries: documentSettings.collapsedTocEntries,
    }
    mainMenu.setItemState(_mainMenu, SHOW_FOR_ALL_DOCS_MENU_ID, showTocForAllDocs)
    mainMenu.setItemState(_mainMenu, SHOW_FOR_THIS_DOC_MENU_ID, showTocForThisDoc)
    ipc.send(ipc.messages.updateToc, _info)

    ipc.listen(ipc.messages.updateToc, tocInfo => {
        documentSettings.collapsedTocEntries = tocInfo.collapsedEntries
        _applicationSettings.tocWidth = tocInfo.widthPx
    })
}

exports.switchVisibilityForApplication = () => {
    _info.isVisible = storage.loadApplicationSettings().showToc = mainMenu.getItemState(
        _mainMenu,
        SHOW_FOR_ALL_DOCS_MENU_ID
    )
    ipc.send(ipc.messages.updateToc, _info)
}

exports.switchVisibilityForDocument = () => {
    const documentSettings = storage.loadDocumentSettings()
    documentSettings.showTocOverridesAppSettings = true
    _info.isVisible = documentSettings.showToc = mainMenu.getItemState(
        _mainMenu,
        SHOW_FOR_THIS_DOC_MENU_ID
    )
    ipc.send(ipc.messages.updateToc, _info)
}
