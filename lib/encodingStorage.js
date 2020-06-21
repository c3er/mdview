const fs = require("fs")
const path = require("path")
const electron = require("electron")

const DEFAULT_ENCODING = "UTF-8"

const _storagePath = path.join(electron.app.getPath("userData"), "encodings.json")

function loadStorage() {
    return fs.existsSync(_storagePath) ? JSON.parse(fs.readFileSync(_storagePath, "utf8")) : {}
}

exports.load = filePath => {
    const encoding = loadStorage()[filePath]
    console.log(loadStorage())
    return encoding !== undefined ? encoding : DEFAULT_ENCODING
}

exports.save = (filePath, encoding) => {
    const storage = loadStorage()
    storage[filePath] = encoding
    fs.writeFileSync(_storagePath, JSON.stringify(storage))
}
