const ipc = require("../ipc/ipcRenderer")

let _document
let _dialogElement

let _dialogIsOpen = false

exports.init = document => {
    _document = document

    _dialogElement = _document.getElementById("settings-dialog")
    _dialogElement.addEventListener("close", () => {
        _dialogIsOpen = false

        // ...
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
