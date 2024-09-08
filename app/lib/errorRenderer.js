const dialog = require("./dialogRenderer")

const DIALOG_ID = "error"

let _document
let _lastErrorMessage = ""
let _dialogElement

exports.DIALOG_ID = DIALOG_ID

exports.init = document => {
    _document = document
    _dialogElement = document.getElementById("error-dialog")
    dialog.addStdButtonHandler(_document.getElementById("error-ok-button"), dialog.close)
}

exports.show = msg =>
    dialog.open(
        DIALOG_ID,
        () => {
            _document.getElementById("error-dialog-content").innerText = msg
            _dialogElement.showModal()

            _lastErrorMessage = msg
        },
        () => _dialogElement.close(),
    )

// For testing

exports.lastErrorMessage = () => _lastErrorMessage

exports.reset = () => (_lastErrorMessage = "")
