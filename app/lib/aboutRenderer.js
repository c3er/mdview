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
    _document
        .querySelector("#about-dialog #application-icon")
        .setAttribute("src", aboutInfo.applicationIconPath)
    _document.querySelector("#about-dialog #hompage").setAttribute("href", aboutInfo.homepage)
    _document.querySelector("#about-dialog #application-name").innerText =
        `${aboutInfo.applicationName} ${aboutInfo.applicationVersion}`
    _document.querySelector("#about-dialog #application-description").innerText =
        aboutInfo.applicationDescription
    _document.querySelector("#about-dialog #framework-versions").innerHTML =
        aboutInfo.frameworkVersions
            .map(([framework, version]) => `<tr><th>${framework}</th><td>${version}</td></tr>`)
            .join("\n")
    _document.querySelector("#about-dialog #issue-link").setAttribute("href", aboutInfo.issueLink)
}

function setupShadows() {
    const scrollContainer = _document.querySelector("div#about-dialog-scroll-container")
    const contentElement = _document.querySelector("div#about-dialog-content")
    renderer.setupShadows(scrollContainer, contentElement)
    renderer.addBottomShadow(scrollContainer, contentElement)
}

exports.DIALOG_ID = DIALOG_ID

exports.init = (document, electronMock) => {
    electron = electronMock ?? require("electron")
    _document = document
    _dialogElement = _document.querySelector("dialog#about-dialog")

    for (const link of _document.querySelectorAll("#about-dialog .dialog-link")) {
        link.onclick = event => {
            event.preventDefault()
            electron.shell.openExternal(link.getAttribute("href"))
        }
    }

    const okButton = _document.querySelector("#about-dialog #about-ok-button")
    dialog.addStdButtonHandler(okButton, () => dialog.close())

    dialog.addStdButtonHandler(
        _document.querySelector("#about-dialog #copy-about-info-button"),
        () => {
            const aboutInfo = structuredClone(_aboutInfo)
            const indentation = 4
            const filterList = ["applicationIconPath"]
            for (const filtered of filterList) {
                delete aboutInfo[filtered]
            }
            electron.clipboard.writeText(JSON.stringify(aboutInfo, null, indentation))

            okButton.focus()
        },
    )

    ipc.listen(ipc.messages.about, aboutInfo =>
        dialog.open(
            DIALOG_ID,
            () => {
                _aboutInfo = aboutInfo
                populateDialog(aboutInfo)
                _dialogElement.showModal()
                setupShadows()
                okButton.focus()
                ipc.send(ipc.messages.aboutDialogIsOpen, true)
            },
            closeDialog,
        ),
    )
}

// For testing

exports.open = () => dialog.open(DIALOG_ID, () => {}, closeDialog)
