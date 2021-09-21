const storage = require("./storage")

const _documentSettings = {}

let _mainMenu
let _storageDir

function toId(encoding) {
    return `encoding-${encoding}`
}

function getDocumentSettings(filePath) {
    return (
        _documentSettings[filePath] ??
        (_documentSettings[filePath] = storage.loadDocumentSettings(
            _storageDir,
            storage.DOCUMENT_SETTINGS_FILE,
            filePath
        ))
    )
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

exports.init = (mainMenu, storageDir) => {
    _mainMenu = mainMenu
    _storageDir = storageDir ?? storage.getDefaultDir()
}

exports.toId = toId

exports.change = (filePath, encoding) => {
    getDocumentSettings(filePath).encoding = encoding
    _mainMenu.getMenuItemById(toId(encoding)).checked = true
}

exports.load = filePath => getDocumentSettings(filePath).encoding
