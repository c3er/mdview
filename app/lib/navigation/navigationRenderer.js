const path = require("path")

const common = require("../common")
const file = require("../file")
const ipc = require("../ipc")

let electron

function isInternalLink(url) {
    return url.startsWith("#")
}

exports.init = electronMock => {
    electron = electronMock ?? require("electron")
}

exports.openLink = (linkElement, target, documentDirectory) => {
    const fullPath = path.join(documentDirectory, target)
    linkElement.onclick = event => {
        event.preventDefault()
        if (common.isWebURL(target) || target.startsWith("mailto:")) {
            electron.shell.openExternal(target)
        } else if (isInternalLink(target)) {
            electron.ipcRenderer.send(ipc.messages.openInternal, target)
        } else if (!file.isMarkdown(fullPath) && !file.isText(fullPath)) {
            electron.shell.openPath(fullPath)
        } else {
            electron.ipcRenderer.send(ipc.messages.openFile, fullPath)
        }
    }
}
