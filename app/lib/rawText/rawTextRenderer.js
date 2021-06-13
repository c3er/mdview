const contentBlocking = require("../contentBlocking/contentBlockingRenderer")
const ipc = require("../ipc")

let _document
let _updateStatusBar

function switchRawView(isRawView) {
    _document.getElementById("content").style.display = isRawView ? "none" : "block"
    _document.getElementById("raw-text").style.display = isRawView ? "block" : "none"
    _updateStatusBar(isRawView ? "Raw text (leve with Ctrl+U)" : "")
    contentBlocking.changeInfoElementVisiblity(!isRawView && contentBlocking.hasBlockedElements())
}

exports.init = (document, updateStatusBar, electronMock) => {
    const electron = electronMock ?? require("electron")
    _document = document
    _updateStatusBar = updateStatusBar

    contentBlocking.init(document, electron)

    electron.ipcRenderer.on(ipc.messages.viewRawText, () => switchRawView(true))

    electron.ipcRenderer.on(ipc.messages.leaveRawText, () => switchRawView(false))
}
