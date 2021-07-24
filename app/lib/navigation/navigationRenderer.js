const path = require("path")

const common = require("../common")
const file = require("../file")
const ipc = require("../ipc")

let electron

let _document

function isInternalLink(url) {
    return url.startsWith("#")
}

exports.init = (document, electronMock) => {
    electron = electronMock ?? require("electron")
    _document = document
}

exports.openLink = (linkElement, target, documentDirectory) => {
    const fullPath = path.join(documentDirectory, target)
    linkElement.onclick = event => {
        event.preventDefault()
        const scrollPosition = _document.documentElement.scrollTop
        if (common.isWebURL(target) || target.startsWith("mailto:")) {
            electron.shell.openExternal(target)
        } else if (isInternalLink(target)) {
            electron.ipcRenderer.send(ipc.messages.openInternal, target, scrollPosition)
        } else if (!file.isMarkdown(fullPath) && !file.isText(fullPath)) {
            electron.shell.openPath(fullPath)
        } else {
            electron.ipcRenderer.send(ipc.messages.openFile, fullPath, scrollPosition)
        }
    }
}
