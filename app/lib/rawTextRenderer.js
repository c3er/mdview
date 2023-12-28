const ipc = require("./ipcRenderer")

let _reloader

let _isInRawView = false

function switchRawView(isRawView) {
    _isInRawView = isRawView
    _reloader()
}

exports.MESSAGE = "Raw text (leve with Ctrl+U)"

exports.init = reloader => {
    _reloader = reloader

    ipc.listen(ipc.messages.viewRawText, () => switchRawView(true))
    ipc.listen(ipc.messages.leaveRawText, () => switchRawView(false))
}

exports.isInRawView = () => _isInRawView

// For testing

exports.isInRawView = () => _isInRawView
