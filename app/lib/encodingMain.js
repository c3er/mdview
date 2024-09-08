const encodingShared = require("./encodingShared")
const ipc = require("./ipcMain")
const storage = require("./storageMain")

let _mainMenu

function toId(encoding) {
    return `encoding-${encodingShared.normalize(encoding)}`
}

function changeEncoding(filePath, encoding) {
    encoding = encodingShared.normalize(encoding)
    storage.loadDocumentSettings(filePath).encoding = encoding

    const menuItem = _mainMenu.getMenuItemById(toId(encoding))
    if (menuItem) {
        menuItem.checked = true
    }
}

// Based on https://encoding.spec.whatwg.org/
exports.ENCODINGS = [
    "UTF-8",
    "IBM866",
    "ISO-8859-2",
    "ISO-8859-3",
    "ISO-8859-4",
    "ISO-8859-5",
    "ISO-8859-6",
    "ISO-8859-7",
    "ISO-8859-8",
    "ISO-8859-8-I",
    "ISO-8859-10",
    "ISO-8859-13",
    "ISO-8859-14",
    "ISO-8859-15",
    "ISO-8859-16",
    "KOI8-R",
    "KOI8-U",
    "macintosh",
    "windows-874",
    "windows-1250",
    "windows-1251",
    "windows-1252",
    "windows-1253",
    "windows-1254",
    "windows-1255",
    "windows-1256",
    "windows-1257",
    "windows-1258",
    "x-mac-cyrillic",
    "GBK",
    "gb18030",
    "Big5",
    "EUC-JP",
    "ISO-2022-JP",
    "Shift_JIS",
    "EUC-KR",
    "UTF-16BE",
    "UTF-16LE",
]

exports.init = mainMenu => {
    _mainMenu = mainMenu

    ipc.listen(ipc.messages.changeEncoding, changeEncoding)
}

exports.toId = toId

exports.change = changeEncoding

exports.load = filePath => storage.loadDocumentSettings(filePath).encoding
