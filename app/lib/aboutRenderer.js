const dialog = require("./dialogRenderer")
const ipc = require("./ipcRenderer")
const renderer = require("./commonRenderer")

let electron

const DIALOG_ID = "about"

let _document
let _dialogElement
let _aboutInfo = {}

function closeDialog() {
    _dialogElement.close()
    ipc.send(ipc.messages.aboutDialogIsOpen, false)
}

function populateDialog(aboutInfo) {
    _document.getElementById("application-icon").setAttribute("src", aboutInfo.applicationIconPath)
    _document.getElementById("hompage").setAttribute("href", aboutInfo.homepage)
    _document.getElementById("application-name").innerText =
        `${aboutInfo.applicationName} ${aboutInfo.applicationVersion}`
    _document.getElementById("application-description").innerText = aboutInfo.applicationDescription
    _document.getElementById("framework-versions").innerHTML = aboutInfo.frameworkVersions
        .map(([framework, version]) => `<tr><th>${framework}</th><td>${version}</td></tr>`)
        .join("\n")
    _document.getElementById("issue-link").setAttribute("href", aboutInfo.issueLink)
}

exports.DIALOG_ID = DIALOG_ID

exports.init = (document, electronMock) => {
    electron = electronMock ?? require("electron")
    _document = document
    _dialogElement = _document.getElementById("about-dialog")

    for (const link of _document.getElementsByClassName("dialog-link")) {
        link.onclick = event => {
            event.preventDefault()
            electron.shell.openExternal(link.getAttribute("href"))
        }
    }

    const okButton = _document.getElementById("about-ok-button")
    renderer.addStdButtonHandler(okButton, () => dialog.close())

    renderer.addStdButtonHandler(_document.getElementById("copy-about-info-button"), () => {
        const aboutInfo = structuredClone(_aboutInfo)
        const indentation = 4
        const filterList = ["applicationIconPath"]
        for (const filtered of filterList) {
            delete aboutInfo[filtered]
        }
        electron.clipboard.writeText(JSON.stringify(aboutInfo, null, indentation))

        okButton.focus()
    })

    ipc.listen(ipc.messages.about, aboutInfo =>
        dialog.open(
            DIALOG_ID,
            () => {
                _aboutInfo = aboutInfo
                populateDialog(aboutInfo)
                _dialogElement.showModal()
                okButton.focus()
                ipc.send(ipc.messages.aboutDialogIsOpen, true)
            },
            closeDialog,
        ),
    )
}

// For testing

exports.open = () => dialog.open(DIALOG_ID, () => {}, closeDialog)
