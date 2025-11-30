const dialog = require("./dialogRenderer")
const renderer = require("./commonRenderer")

const DIALOG_ID = "question"

let _document

let _dialogElement
let _okButton
let _cancelButton

let _hasConfirmed

exports.init = document => {
    _document = document

    _dialogElement = _document.querySelector("dialog#question-dialog")
    _okButton = _document.querySelector("button#question-ok-button")
    _cancelButton = _document.querySelector("button#question-cancel-button")
}

exports.ask = (question, confirmLabel, declineLabel) => {
    _hasConfirmed = false
    renderer.addStdButtonHandler(_okButton, () => {
        _hasConfirmed = true
        dialog.close()
    })
    renderer.addStdButtonHandler(_cancelButton, () => {
        _hasConfirmed = false
        dialog.close()
    })
    return new Promise(resolve =>
        dialog.open(
            DIALOG_ID,
            () => {
                _document.querySelector("dialog #question-dialog-content").innerText = question
                _okButton.innerText = confirmLabel
                _cancelButton.innerText = declineLabel

                _dialogElement.showModal()
            },
            () => {
                _dialogElement.close()
                resolve(_hasConfirmed)
            },
        ),
    )
}
