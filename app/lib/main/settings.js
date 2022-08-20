const fs = require("fs")
const path = require("path")

const common = require("../common")
const log = require("../log/log")
const navigation = require("../navigation/navigationMain")

let electron

const JSON_INDENTATION = 4

const APPLICATION_SETTINGS_FILE = "app-settings.json"
const DOCUMENT_SETTINGS_FILE = "doc-settings.json"

let _dataDir

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
            fs.writeFileSync(this._storagePath, JSON.stringify(this._data, null, JSON_INDENTATION))
        } catch (error) {
            log.error(error)
        }
    }

    static _initStorageDir(storageDir) {
        fs.mkdirSync(storageDir ?? _dataDir, { recursive: true })
    }

    static _initData(storagePath) {
        return fs.existsSync(storagePath) ? JSON.parse(fs.readFileSync(storagePath, "utf8")) : {}
    }
}

class ApplicationSettings extends StorageBase {
    #THEME_KEY = "theme"
    #ZOOM_KEY = "zoom"
    #LINE_BREAKS_KEY = "line-breaks-enabled"
    #TYPOGRAPHY_KEY = "typography-enabled"
    #EMOJIS_KEY = "emojis-enabled"
    #MD_FILE_TYPES_KEY = "md-file-types"

    ZOOM_DEFAULT = 1.0

    SYSTEM_THEME = "system"
    LIGHT_THEME = "light"
    DARK_THEME = "dark"

    LINE_BREAKS_ENABLED_DEFAULT = false
    TYPOGRAPHY_ENABLED_DEFAULT = true
    EMOJIS_ENABLED_DEFAULT = true
    MD_FILE_TYPES_DEFAULT = common.FILE_EXTENSIONS

    get theme() {
        return this._loadValue(this.#THEME_KEY, electron.nativeTheme.themeSource)
    }

    set theme(value) {
        const allowedThemes = [this.SYSTEM_THEME, this.LIGHT_THEME, this.DARK_THEME]
        if (!allowedThemes.includes(value)) {
            throw new Error(`"${value}" is not in allowed values ${allowedThemes.join(", ")}`)
        }

        electron.nativeTheme.themeSource = value
        this._storeValue(this.#THEME_KEY, value)
    }

    get zoom() {
        return this._loadValue(this.#ZOOM_KEY, this.ZOOM_DEFAULT)
    }

    set zoom(value) {
        this._storeValue(this.#ZOOM_KEY, value)
    }

    get lineBreaksEnabled() {
        return this._loadValue(this.#LINE_BREAKS_KEY, this.LINE_BREAKS_ENABLED_DEFAULT)
    }

    set lineBreaksEnabled(value) {
        this._storeValue(this.#LINE_BREAKS_KEY, value)
    }

    get typographyEnabled() {
        return this._loadValue(this.#TYPOGRAPHY_KEY, this.TYPOGRAPHY_ENABLED_DEFAULT)
    }

    set typographyEnabled(value) {
        this._storeValue(this.#TYPOGRAPHY_KEY, value)
    }

    get emojisEnabled() {
        return this._loadValue(this.#EMOJIS_KEY, this.EMOJIS_ENABLED_DEFAULT)
    }

    set emojisEnabled(value) {
        this._storeValue(this.#EMOJIS_KEY, value)
    }

    get mdFileTypes() {
        return this._loadValue(this.#MD_FILE_TYPES_KEY, this.MD_FILE_TYPES_DEFAULT)
    }

    set mdFileTypes(value) {
        this._storeValue(this.#MD_FILE_TYPES_KEY, value)
    }

    _loadValue(key, defaultValue) {
        return this._data[key] ?? defaultValue
    }

    _storeValue(key, value) {
        this._data[key] = value
        this._save()
    }
}

class DocumentSettings extends StorageBase {
    #ENCODING_KEY = "encoding"
    #RENDER_AS_MD_KEY = "render-as-md"
    #WINDOW_POSITION_KEY = "window-position"

    ENCODING_DEFAULT = null
    RENDER_AS_MD_DEFAULT = false
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

    get renderAsMarkdown() {
        return this._loadValue(this.#RENDER_AS_MD_KEY, this.RENDER_AS_MD_DEFAULT)
    }

    set renderAsMarkdown(value) {
        this._storeValue(this.#RENDER_AS_MD_KEY, value)
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

exports.SUBDIR = "settings"

exports.init = (dataDir, electronMock) => {
    electron = electronMock ?? require("electron")
    exports.dataDir = _dataDir = dataDir
}

exports.loadApplicationSettings = () =>
    _applicationSettings ??
    (_applicationSettings = new ApplicationSettings(_dataDir, APPLICATION_SETTINGS_FILE))

exports.loadDocumentSettings = documentPath => {
    documentPath = documentPath ?? navigation.getCurrentLocation().filePath
    return (
        _documentSettings[documentPath] ??
        (_documentSettings[documentPath] = new DocumentSettings(
            _dataDir,
            DOCUMENT_SETTINGS_FILE,
            documentPath
        ))
    )
}
