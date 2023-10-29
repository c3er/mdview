const fs = require("fs")
const path = require("path")

const common = require("../common")
const error = require("../error/errorRenderer")
const file = require("../file")
const ipc = require("../ipc/ipcRenderer")
const renderer = require("../renderer/common")

let electron

function isInternalLink(url) {
    return url.startsWith("#")
}

function checkFile(filePath) {
    if (!fs.existsSync(filePath)) {
        error.show(`Cannot display: "${filePath}" does not exist`)
        return false
    }
    const fileStat = fs.statSync(filePath)
    if (fileStat.isDirectory()) {
        error.show(`Cannot display: "${filePath}" is a directory`)
        return false
    }
    if (!fileStat.isFile()) {
        error.show(`Cannot display: "${filePath}" is not a valid file`)
        return false
    }
    if (!file.isText(filePath)) {
        error.show(`Cannot display: "${filePath}" is not a text file`)
        return false
    }
    return true
}

function openFile(fullPath, shallOpenInNewWindow, scrollPosition = 0) {
    ipc.send(
        shallOpenInNewWindow ? ipc.messages.openFileInNewWindow : ipc.messages.openFile,
        fullPath,
        scrollPosition,
    )
}

function dispatchLink(target, documentDirectory, shallOpenInNewWindow) {
    const fullPath = path.join(documentDirectory, target)
    const scrollPosition = renderer.contentElement().scrollTop
    if (common.isWebURL(target) || target.startsWith("mailto:")) {
        electron.shell.openExternal(target)
    } else if (isInternalLink(target)) {
        ipc.send(
            shallOpenInNewWindow ? ipc.messages.openInternalInNewWindow : ipc.messages.openInternal,
            target,
            scrollPosition,
        )
    } else if (!file.isMarkdown(fullPath) && !file.isText(fullPath)) {
        electron.shell.openPath(fullPath)
    } else if (checkFile(fullPath)) {
        openFile(fullPath, shallOpenInNewWindow, scrollPosition)
    }
}

exports.init = electronMock => (electron = electronMock ?? require("electron"))

exports.registerLink = (linkElement, target, documentDirectory) => {
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

exports.back = () => ipc.send(ipc.messages.navigateBack)

exports.checkFile = checkFile

exports.openFile = openFile
