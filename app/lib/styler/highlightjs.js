const { isNull } = require("lodash")
const ipc = require("../ipc")

let _document
let _currentStyleId
const stylePrefix = "user_choosen_style_"

function unloadStyle() {
  // remove the "link" tag using its ID
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

    // create a link to the choosen stylesheet file
    let link = _document.createElement("link")
    link.href = `../app/css/${styleName}.css`
    link.type = "text/css"
    link.rel = "stylesheet"
    link.media = "screen"
    link.id = stylePrefix + styleName
    
    // save the ID of the choosen style: to be used when unloading is called
    _currentStyleId = link.id

    // load user choosen styling i.e. insert a style link to the displayed document,
    // since this will override the default i.e already loaded highlighjs styles
    let head = _document.getElementsByTagName("head")[0]
    head.appendChild(link)
}

exports.init = (document, electronMock) => {
    const electron = electronMock ?? require("electron")
    _document = document
    electron.ipcRenderer.on(ipc.messages.changeHighlightjsStyle, (_, styleName) => {
        loadStyle(styleName)
    })
}
