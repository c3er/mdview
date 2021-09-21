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
    #WINDOW_POSITION_KEY = "window-position"

    ENCODING_DEFAULT = "UTF-8"
    WINDOW_WIDTH_DEFAULT = 1024
    WINDOW_HEIGHT_DEFAULT = 768

    _documentData

    constructor(storageDir, storageFile, documentPath) {
        super(storageDir, storageFile)
        if (!this._data[documentPath]) {
            this._data[documentPath] = {}
        }
        this._documentData = this._data[documentPath]
    }

    get encoding() {
        return this._loadValue(this.#ENCODING_KEY, this.ENCODING_DEFAULT)
    }

    set encoding(value) {
        this._storeValue(this.#ENCODING_KEY, value)
    }

    get windowPosition() {
        const screenSize = electron.screen.getPrimaryDisplay().size
        return this._loadValue(this.#WINDOW_POSITION_KEY, {
            x: screenSize.width / 2 - this.WINDOW_WIDTH_DEFAULT / 2,
            y: screenSize.height / 2 - this.WINDOW_HEIGHT_DEFAULT / 2,
            width: this.WINDOW_WIDTH_DEFAULT,
            height: this.WINDOW_HEIGHT_DEFAULT,
        })
    }

    set windowPosition(value) {
        this._storeValue(this.#WINDOW_POSITION_KEY, value)
    }

    _loadValue(key, defaultValue) {
        return this._documentData[key] ?? defaultValue
    }

    _storeValue(key, value) {
        this._documentData[key] = value
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

exports.loadApplicationSettings = (storageDir, storageFile) =>
    _applicationSettings ??
    (_applicationSettings = new ApplicationSettings(storageDir, storageFile))

exports.loadDocumentSettings = (storageDir, storageFile, documentPath) =>
    _documentSettings[documentPath] ??
    (_documentSettings[documentPath] = new DocumentSettings(storageDir, storageFile, documentPath))

exports.getDefaultDir = getDefaultDir
