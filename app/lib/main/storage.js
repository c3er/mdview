const fs = require("fs")
const path = require("path")

let electron

const APPLICATION_SETTINGS_FILE = "app-settings.json"
const DOCUMENT_SETTINGS_FILE = "doc-settings.json"

let _applicationSettings
let _documentSettings = {}

class StorageBase {
    _storagePath
    _data

    constructor(storageDir, storageFile) {
        StorageBase._initStorageDir(storageDir)
        this._storagePath = path.join(storageDir, storageFile)
        this._data = StorageBase._initData(this._storagePath)
    }

    _save() {
        try {
            fs.writeFileSync(this._storagePath, JSON.stringify(this._data))
        } catch (error) {
            console.error(error)
        }
    }

    static _initStorageDir(storageDir) {
        fs.mkdirSync(storageDir ?? getDefaultDir(), { recursive: true })
    }

    static _initData(storagePath) {
        return fs.existsSync(storagePath) ? JSON.parse(fs.readFileSync(storagePath, "utf8")) : {}
    }
}

class ApplicationSettings extends StorageBase {
    #THEME_KEY = "theme"

    LIGHT_THEME = "light"
    DARK_THEME = "dark"

    get theme() {
        return this._data[this.#THEME_KEY] ?? electron.nativeTheme.themeSource
    }

    set theme(value) {
        const allowedThemes = [this.LIGHT_THEME, this.DARK_THEME]
        if (!allowedThemes.includes(value)) {
            throw new Error(`"${value}" is not in allowed values ${allowedThemes.join(", ")}`)
        }

        this._data[this.#THEME_KEY] = electron.nativeTheme.themeSource = value
        this._save()
    }
}

class DocumentSettings extends StorageBase {
    #ENCODING_KEY = "encoding"

    DEFAULT_ENCODING = "UTF-8"

    _documentData

    constructor(storageDir, storageFile, documentPath) {
        super(storageDir, storageFile)
        if (!this._data[documentPath]) {
            this._data[documentPath] = {}
        }
        this._documentData = this._data[documentPath]
    }

    get encoding() {
        return this._documentData[this.#ENCODING_KEY] ?? this.DEFAULT_ENCODING
    }

    set encoding(value) {
        this._documentData[this.#ENCODING_KEY] = value
        this._save()
    }
}

function getDefaultDir() {
    // electron.app.getPath does not work in tests
    return path.join(electron.app.getPath("userData"), "storage")
}

exports.APPLICATION_SETTINGS_FILE = APPLICATION_SETTINGS_FILE

exports.DOCUMENT_SETTINGS_FILE = DOCUMENT_SETTINGS_FILE

exports.init = electronMock => (electron = electronMock ?? require("electron"))

exports.initApplicationSettings = (storageDir, storageFile) =>
    _applicationSettings ??
    (_applicationSettings = new ApplicationSettings(storageDir, storageFile))

exports.initDocumentSettings = (storageDir, storageFile, documentPath) =>
    _documentSettings[documentPath] ??
    (_documentSettings[documentPath] = new DocumentSettings(storageDir, storageFile, documentPath))

exports.getDefaultDir = getDefaultDir
