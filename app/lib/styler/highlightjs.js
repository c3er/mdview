const { isNull } = require("lodash")
const ipc = require("../ipc")

let _mainWindow
let _document
let _currentStyleId
const stylePrefix = "user_choosen_style_"

function unloadStyle() {
    if (!isNull(_currentStyleId)) {
        var link = _document.getElementById(_currentStyleId)
        if (!isNull(link)) {
            link.remove()
            _currentStyleId = null
        }
    }
}

function loadStyle(styleName) {
    // always unload any existing user choosen styling first
    unloadStyle()
    // check if the user has choosen a style (otherwise, it's a "reset" and we're done)
    if (isNull(styleName)) {
        return
    }
    // load user choosen styling i.e. insert a link to css file, since this will override the default styles
    var head = _document.getElementsByTagName("head")[0]
    var path = "../app/css/" + styleName + ".css"
    var link = _document.createElement("link")
    link.href = path
    link.type = "text/css"
    link.rel = "stylesheet"
    link.media = "screen"
    link.id = stylePrefix + styleName
    // save the ID of the loaded style: to be used when unloading...
    _currentStyleId = link.id
    head.appendChild(link)
}

exports.init = (document, window, electronMock) => {
    const electron = electronMock ?? require("electron")
    _mainWindow = window
    _document = document
    electron.ipcRenderer.on(ipc.messages.changeHighlightjsStyle, (_, styleName) => {
        loadStyle(styleName)
    })
}
