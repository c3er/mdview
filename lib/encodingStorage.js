const fs = require("fs")
const path = require("path")
const electron = require("electron")

let _storagePath

function loadStorage() {
    return fs.existsSync(_storagePath) ? JSON.parse(fs.readFileSync(_storagePath, "utf8")) : {}
}

const DEFAULT_ENCODING = exports.DEFAULT_ENCODING = "UTF-8"

exports.init = storagePath => {
    _storagePath = storagePath || path.join(electron.app.getPath("userData"), "encodings.json")
}

exports.load = filePath => {
    const encoding = loadStorage()[filePath]
    return encoding !== undefined ? encoding : DEFAULT_ENCODING
}

exports.save = (filePath, encoding) => {
    const storage = loadStorage()
    storage[filePath] = encoding
    fs.writeFileSync(_storagePath, JSON.stringify(storage))
}
