const ipc = require("../ipc/ipcRenderer")

let _statusBarUpdater
let _reloader

let _isInRawView = false

function switchRawView(isRawView) {
    _isInRawView = isRawView
    _reloader()
}

exports.MESSAGE = "Raw text (leve with Ctrl+U)"

exports.init = (statusBarUpdater, reloader) => {
    _statusBarUpdater = statusBarUpdater
    _reloader = reloader

    ipc.listen(ipc.messages.viewRawText, () => switchRawView(true))
    ipc.listen(ipc.messages.leaveRawText, () => switchRawView(false))
}

exports.isInRawView = () => _isInRawView
