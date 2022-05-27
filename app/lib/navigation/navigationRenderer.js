const path = require("path")

const common = require("../common")
const file = require("../file")
const ipc = require("../ipc/ipc")

let electron

let _document

function isInternalLink(url) {
    return url.startsWith("#")
}

function dispatchLink(target, documentDirectory, shallOpenInNewWindow) {
    const fullPath = path.join(documentDirectory, target)
    const scrollPosition = _document.documentElement.scrollTop
    if (common.isWebURL(target) || target.startsWith("mailto:")) {
        electron.shell.openExternal(target)
    } else if (isInternalLink(target)) {
        electron.ipcRenderer.send(
            shallOpenInNewWindow ? ipc.messages.openInternalInNewWindow : ipc.messages.openInternal,
            target,
            scrollPosition
        )
    } else if (!file.isMarkdown(fullPath) && !file.isText(fullPath)) {
        electron.shell.openPath(fullPath)
    } else {
        electron.ipcRenderer.send(
            shallOpenInNewWindow ? ipc.messages.openFileInNewWindow : ipc.messages.openFile,
            fullPath,
            scrollPosition
        )
    }
}

exports.init = (document, electronMock) => {
    electron = electronMock ?? require("electron")
    _document = document
}

exports.openLink = (linkElement, target, documentDirectory) => {
    linkElement.onclick = event => {
        event.preventDefault()
        dispatchLink(target, documentDirectory, false)
    }
    linkElement.onauxclick = event => {
        event.preventDefault()
        if (event.button === 1) {
            dispatchLink(target, documentDirectory, true)
        }
    }
}
