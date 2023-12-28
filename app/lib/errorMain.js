const log = require("./log")

const SHOW_ERROR_MENU_ID = "show-error"

let _electron
let _process

exports.SHOW_ERROR_MENU_ID = SHOW_ERROR_MENU_ID

exports.init = (process, electronMock) => {
    _process = process
    _electron = electronMock ?? require("electron")
}

exports.show = msg => {
    log.error("Error:", msg)
    _electron.dialog.showErrorBox("Error", `${msg}. Exiting.`)
    _process.exit(1)
}
