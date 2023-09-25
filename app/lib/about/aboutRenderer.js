const dialog = require("../renderer/dialog")
const ipc = require("../ipc/ipcRenderer")

let electron

const DIALOG_ID = "about"

let _document
let _dialogElement
let _okButton

function populateDialog(aboutInfo) {
    _document.getElementById("application-icon").setAttribute("src", aboutInfo.applicationIconPath)
    _document.getElementById("hompage").setAttribute("href", aboutInfo.homepage)
    _document.getElementById(
        "application-name",
    ).innerText = `${aboutInfo.applicationName} ${aboutInfo.applicationVersion}`
    _document.getElementById("application-description").innerText = aboutInfo.applicationDescription
    _document.getElementById("framework-versions").innerHTML = aboutInfo.frameworkVersions
        .map(([framework, version]) => `<tr><th>${framework}</th><td>${version}</td></tr>`)
        .join("\n")
    _document.getElementById("issue-link").setAttribute("href", aboutInfo.issueLink)
}

exports.init = (document, electronMock) => {
    electron = electronMock ?? require("electron")
    _document = document
    _dialogElement = _document.getElementById("about-dialog")
    _okButton = _document.getElementById("about-ok-button")

    for (const link of _document.getElementsByClassName("dialog-link")) {
        link.onclick = event => {
            event.preventDefault()
            electron.shell.openExternal(link.getAttribute("href"))
        }
    }

    dialog.addStdButtonHandler(_okButton, () => dialog.close())
    ipc.listen(ipc.messages.about, aboutInfo =>
        dialog.open(
            DIALOG_ID,
            () => {
                populateDialog(aboutInfo)
                _dialogElement.showModal()
                _okButton.focus()
                ipc.send(ipc.messages.aboutDialogIsOpen, true)
            },
            () => {
                _dialogElement.close()
                ipc.send(ipc.messages.aboutDialogIsOpen, false)
            },
        ),
    )
}
