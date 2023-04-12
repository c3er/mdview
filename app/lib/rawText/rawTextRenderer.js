const contentBlocking = require("../contentBlocking/contentBlockingRenderer")
const ipc = require("../ipc/ipcRenderer")

let _document
let _updateStatusBar

function switchRawView(isRawView) {
    _document.getElementById("content").style.display = isRawView ? "none" : "flex"
    _document.getElementById("raw-text").style.display = isRawView ? "block" : "none"
    _updateStatusBar(isRawView ? "Raw text (leve with Ctrl+U)" : "")
    contentBlocking.changeInfoElementVisiblity(!isRawView && contentBlocking.hasBlockedElements())
}

exports.init = (document, window, updateStatusBar) => {
    _document = document
    _updateStatusBar = updateStatusBar

    contentBlocking.init(document, window)
    ipc.listen(ipc.messages.viewRawText, () => switchRawView(true))
    ipc.listen(ipc.messages.leaveRawText, () => switchRawView(false))
}
