const fs = require("fs")
const path = require("path")

let electron = require("electron")

const SETTINGS_FILE = "settings.json"
const ENCODINGS_FILE = "encodings.json"

let _isTest = false

let _settings
let _encodings

class StorageBase {
    _storagePath
    _data

    constructor(storageDir, storageFile) {
        StorageBase._initStorageDir(storageDir)
        this._storagePath = path.join(storageDir, storageFile)
        this._data = StorageBase._initData(this._storagePath)

        if (!_isTest) {
            console.debug(`Initialized storage file ${this._storagePath}`)
            console.debug(`Storage content: ${JSON.stringify(this._data)}`)
        }
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

class Settings extends StorageBase {
    #THEME_KEY = "theme"

    LIGHT_THEME = "light"
    DARK_THEME = "dark"

    get theme() {
        return this._data[this.#THEME_KEY] ?? electron.nativeTheme.themeSource
    }

    set theme(value) {
        const allowedThemes = [this.LIGHT_THEME, this.DARK_THEME]
        if (!allowedThemes.includes(value)) {
            throw {
                message: `"${value}" is not in allowed values ${allowedThemes.join(", ")}`,
            }
        }

        this._data[this.#THEME_KEY] = electron.nativeTheme.themeSource = value
        this._save()
    }
}

class Encodings extends StorageBase {
    DEFAULT = "UTF-8"

    load(documentPath) {
        return this._data[documentPath] ?? this.DEFAULT
    }

    save(documentPath, encoding) {
        this._data[documentPath] = encoding
        this._save()
    }
}

function getDefaultDir() {
    // electron.app.getPath does not work in tests
    return path.join(electron.app.getPath("userData"), "storage")
}

exports.SETTINGS_FILE = SETTINGS_FILE

exports.ENCODINGS_FILE = ENCODINGS_FILE

exports.getDefaultDir = getDefaultDir

exports.initSettings = (settingsStorageDir, settingsStorageFile, electronMock) => {
    if (electronMock) {
        electron = electronMock
        _isTest = true
    }
    return _settings ?? (_settingss = new Settings(settingsStorageDir, settingsStorageFile))
}

exports.initEncodings = (encodingStorageDir, encodingStorageFile) =>
    _encodings ?? (_encodings = new Encodings(encodingStorageDir, encodingStorageFile))
