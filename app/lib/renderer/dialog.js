const _dialogs = []

function isOpen() {
    return _dialogs.length > 0
}

exports.open = (id, openCallback, closeCallback) => {
    _dialogs.push({
        id: id,
        closeCallback: closeCallback,
    })
    openCallback()
}

exports.close = () => {
    if (_dialogs.length <= 0) {
        throw new Error("dialog.close was called more often than dialog.open")
    }
    _dialogs.pop().closeCallback()
}

exports.isOpen = isOpen

exports.addStdButtonHandler = (element, callback) => {
    element.addEventListener("click", event => {
        event.preventDefault()
        callback()
    })
}

// For testing

exports.reset = () => (_dialogs.length = 0)

exports.current = () => (isOpen() ? _dialogs.at(-1) : null)
