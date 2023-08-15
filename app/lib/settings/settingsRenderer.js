const ipc = require("../ipc/ipcRenderer")

const DIALOG_TAB_CLASS = "dialog-tab"
const DIALOG_TAB_CONSTENT_CLASS = "dialog-tab-content"

let _document
let _dialogElement

let _dialogIsOpen = false

let _tabElements
let _tabContentElements

function changeTab(tabIndex) {
    for (const [i, tabContentElement] of _tabContentElements.entries()) {
        tabContentElement.style.display = i === tabIndex ? "block" : "none"
    }
}

exports.init = document => {
    _document = document

    _tabElements = [..._document.getElementsByClassName(DIALOG_TAB_CLASS)]
    _tabContentElements = [..._document.getElementsByClassName(DIALOG_TAB_CONSTENT_CLASS)]
    for (const [i, tabElement] of _tabElements.entries()) {
        tabElement.addEventListener("click", () => changeTab(i))
    }
    changeTab(0)

    _dialogElement = _document.getElementById("settings-dialog")
    _dialogElement.addEventListener("close", () => {
        _dialogIsOpen = false
        ipc.send(ipc.messages.settingsDialogIsOpen, false)
    })

    _document.getElementById("settings-ok-button").addEventListener("click", event => {
        event.preventDefault()
        _dialogElement.close()
    })
    _document.getElementById("settings-apply-button").addEventListener("click", event => {
        event.preventDefault()
    })

    ipc.listen(ipc.messages.settings, () => {
        _dialogElement.showModal()
        _dialogIsOpen = true
        ipc.send(ipc.messages.settingsDialogIsOpen, true)
    })
}

exports.close = () => _dialogElement.close()

exports.isOpen = () => _dialogIsOpen
