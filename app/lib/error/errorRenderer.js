const dialog = require("../renderer/dialog")

let _document

let _lastErrorMessage = ""

let _dialogElement
let _dialogIsOpen = false

function closeDialog() {
    _dialogElement.close()
    _dialogIsOpen = false
}

exports.init = document => {
    _document = document

    _dialogElement = document.getElementById("error-dialog")
    _dialogIsOpen = false

    dialog.addStdButtonHandler(_document.getElementById("error-ok-button"), closeDialog)
}

exports.show = msg => {
    _document.getElementById("error-dialog-content").innerText = msg
    _dialogElement.showModal()
    _dialogIsOpen = true

    _lastErrorMessage = msg
}

exports.close = closeDialog

exports.isOpen = () => _dialogIsOpen

// For testing

exports.lastErrorMessage = () => _lastErrorMessage

exports.reset = () => {
    _lastErrorMessage = ""
    _dialogIsOpen = false
}
