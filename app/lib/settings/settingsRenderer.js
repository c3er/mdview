const ipc = require("../ipc/ipcRenderer")

const DIALOG_TAB_CLASS = "dialog-tab"
const DIALOG_TAB_CONSTENT_CLASS = "dialog-tab-content"

let _document
let _dialogElement

let _dialogIsOpen = false

let _tabElements
let _tabContentElements

function changeTab(tabIndex) {
    const tabCount = _tabElements.length
    for (let i = 0; i < tabCount; i++) {
        _tabElements[i].style.borderBottomStyle = i === tabIndex ? "none" : "solid"
        _tabContentElements[i].style.display = i === tabIndex ? "block" : "none"
    }
}

exports.init = document => {
    _document = document
    _dialogElement = _document.getElementById("settings-dialog")

    _tabElements = [..._document.getElementsByClassName(DIALOG_TAB_CLASS)]
    _tabContentElements = [..._document.getElementsByClassName(DIALOG_TAB_CONSTENT_CLASS)]

    // Tabs should have the same height. To determine the maximum height, the dialog has to be visible.
    _dialogElement.show()
    const maxTabHeight = Math.max(..._tabContentElements.map(element => element.clientHeight))
    _dialogElement.close()

    const tabCount = _tabElements.length
    for (let i = 0; i < tabCount; i++) {
        _tabElements[i].addEventListener("click", () => changeTab(i))
        _tabContentElements[i].style.minHeight = `${maxTabHeight}px`
    }
    changeTab(0)

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
