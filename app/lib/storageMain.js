const fs = require("fs")
const path = require("path")

const common = require("./common")
const contentBlocking = require("./contentBlockingShared")
const dragDrop = require("./dragDropShared")
const log = require("./log")
const navigation = require("./navigationMain")

let electron

const JSON_INDENTATION = 4

const APPLICATION_SETTINGS_VERSION = 1
const DOCUMENT_SETTINGS_VERSION = 0
const FILE_HISTORY_VERSION = 0
const CONTENT_BLOCKING_VERSION = 0

const APPLICATION_SETTINGS_FILE = "app-settings.json"
const DOCUMENT_SETTINGS_FILE = "doc-settings.json"
const FILE_HISTORY_FILE = "file-history.json"
const CONTENT_BLOCKING_FILE = "content-blocking.json"

let _dataDir

let _applicationSettings
let _fileHistory
let _contentBlocking
let _documentSettings = {}

class StorageBase {
    #VERSION_KEY = "version"

    _storagePath
    _data

    curentVersion
    actualVersion

    constructor(currentVersion, storageDir, storageFile) {
        StorageBase._initStorageDir(storageDir)

        this._storagePath = path.join(storageDir, storageFile)
        this._data = StorageBase._initData(this._storagePath)

        this.curentVersion = currentVersion
        this.actualVersion = this._data[this.#VERSION_KEY] ?? 0
        this._data[this.#VERSION_KEY] = currentVersion
    }

    _save() {
        try {
            fs.writeFileSync(this._storagePath, JSON.stringify(this._data, null, JSON_INDENTATION))
        } catch (error) {
            log.error(error)
        }
    }

    toJSON() {
        const getters = common.listGettersWithSetters(this)
        const obj = {}
        for (const getter of getters) {
            obj[getter] = this[getter]
        }
        return obj
    }

    static _initStorageDir(storageDir) {
        fs.mkdirSync(storageDir ?? _dataDir, { recursive: true })
    }

    static _initData(storagePath) {
        try {
            return fs.existsSync(storagePath)
                ? JSON.parse(fs.readFileSync(storagePath, "utf8"))
                : {}
        } catch (err) {
            log.error(`Could not read settings in ${storagePath}: ${err}`)
            return {}
        }
    }
}

class ApplicationSettings extends StorageBase {
    #THEME_KEY = "theme"
    #ZOOM_KEY = "zoom"
    #LINE_BREAKS_KEY = "line-breaks-enabled"
    #TYPOGRAPHY_KEY = "typography-enabled"
    #EMOJIS_KEY = "emojis-enabled"
    #MD_FILE_TYPES_KEY = "md-file-types"
    #SHOW_TOC_KEY = "show-toc"
    #TOC_WIDTH_KEY = "toc-width"
    #HIDE_METADATA_KEY = "hide-metadata"
    #DRAG_DROP_BEHAVIOR_KEY = "drag-drop-behavior"
    #FILE_HISTORY_SIZE_KEY = "file-history-size"

    SYSTEM_THEME = common.SYSTEM_THEME
    LIGHT_THEME = common.LIGHT_THEME
    DARK_THEME = common.DARK_THEME

    ZOOM_DEFAULT = common.ZOOM_DEFAULT

    LINE_BREAKS_ENABLED_DEFAULT = false
    TYPOGRAPHY_ENABLED_DEFAULT = true
    EMOJIS_ENABLED_DEFAULT = true
    MD_FILE_TYPES_DEFAULT = common.FILE_EXTENSIONS

    SHOW_TOC_DEFAULT = false
    TOC_WIDTH_DEFAULT = null

    HIDE_METADATA_DEFAULT = false
    DRAG_DROP_BEHAVIOR_DEFAULT = dragDrop.behavior.ask
    FILE_HISTORY_SIZE_DEFAULT = 5

    constructor(storageDir, storageFile) {
        super(APPLICATION_SETTINGS_VERSION, storageDir, storageFile)
        this._updateVersion()
    }

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

    get showToc() {
        return this._loadValue(this.#SHOW_TOC_KEY, this.SHOW_TOC_DEFAULT)
    }

    set showToc(value) {
        this._storeValue(this.#SHOW_TOC_KEY, value)
    }

    get tocWidth() {
        return this._loadValue(this.#TOC_WIDTH_KEY, this.TOC_WIDTH_DEFAULT)
    }

    set tocWidth(value) {
        this._storeValue(this.#TOC_WIDTH_KEY, value)
    }

    get hideMetadata() {
        return this._loadValue(this.#HIDE_METADATA_KEY, this.HIDE_METADATA_DEFAULT)
    }

    set hideMetadata(value) {
        this._storeValue(this.#HIDE_METADATA_KEY, value)
    }

    get dragDropBehavior() {
        return this._loadValue(this.#DRAG_DROP_BEHAVIOR_KEY, this.DRAG_DROP_BEHAVIOR_DEFAULT)
    }

    set dragDropBehavior(value) {
        this._storeValue(this.#DRAG_DROP_BEHAVIOR_KEY, value)
    }

    get fileHistorySize() {
        return this._loadValue(this.#FILE_HISTORY_SIZE_KEY, this.FILE_HISTORY_SIZE_DEFAULT)
    }

    set fileHistorySize(value) {
        this._storeValue(this.#FILE_HISTORY_SIZE_KEY, value)
    }

    _loadValue(key, defaultValue) {
        return this._data[key] ?? defaultValue
    }

    _storeValue(key, value) {
        this._data[key] = value
        this._save()
    }

    _updateVersion() {
        if (this.actualVersion === this.VERSION) {
            return
        }

        // Currently, the only previous version is version 0
        this.mdFileTypes = [...new Set(this.mdFileTypes.map(fileType => fileType.toLowerCase()))]
    }
}

class DocumentSettings extends StorageBase {
    #ENCODING_KEY = "encoding"
    #RENDER_AS_MD_KEY = "render-as-md"
    #WINDOW_POSITION_KEY = "window-position"
    #SHOW_TOC_OVERRIDES_APP_SETTINGS_KEY = "show-toc-override"
    #SHOW_TOC_KEY = "show-toc"
    #COLLAPSED_TOC_ENTRIES_KEY = "collapsed-toc-entries"

    ENCODING_DEFAULT = null
    RENDER_AS_MD_DEFAULT = false
    WINDOW_WIDTH_DEFAULT = 1024
    WINDOW_HEIGHT_DEFAULT = 768

    SHOW_TOC_OVERRIDES_APP_SETTINGS_DEFAULT = false
    SHOW_TOC_DEFAULT = false
    COLLAPSED_TOC_ENTRIES_DEFAULT = []

    _documentData

    constructor(storageDir, storageFile, documentPath) {
        super(DOCUMENT_SETTINGS_VERSION, storageDir, storageFile)
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

    get showTocOverridesAppSettings() {
        return this._loadValue(
            this.#SHOW_TOC_OVERRIDES_APP_SETTINGS_KEY,
            this.SHOW_TOC_OVERRIDES_APP_SETTINGS_DEFAULT,
        )
    }

    set showTocOverridesAppSettings(value) {
        this._storeValue(this.#SHOW_TOC_OVERRIDES_APP_SETTINGS_KEY, value)
    }

    get showToc() {
        return this._loadValue(this.#SHOW_TOC_KEY, this.SHOW_TOC_DEFAULT)
    }

    set showToc(value) {
        this._storeValue(this.#SHOW_TOC_KEY, value)
    }

    get collapsedTocEntries() {
        return this._loadValue(this.#COLLAPSED_TOC_ENTRIES_KEY, this.COLLAPSED_TOC_ENTRIES_DEFAULT)
    }

    set collapsedTocEntries(value) {
        this._storeValue(this.#COLLAPSED_TOC_ENTRIES_KEY, value)
    }

    _loadValue(key, defaultValue) {
        return this._documentData[key] ?? defaultValue
    }

    _storeValue(key, value) {
        this._documentData[key] = value
        this._save()
    }
}

class FileHistory extends StorageBase {
    constructor(storageDir, storageFile) {
        super(FILE_HISTORY_VERSION, storageDir, storageFile)
        if (!this._data.files) {
            this._data.files = []
        }
    }

    get filePaths() {
        return this._data.files
    }

    hasFiles() {
        return this.filePaths.length > 0
    }

    add(filePath) {
        const filePathIndex = this.filePaths.indexOf(filePath)
        if (filePathIndex > -1) {
            this.filePaths.splice(filePathIndex, 1)
        }

        this.filePaths.unshift(filePath)
        if (this.filePaths.length > loadApplicationSettings().fileHistorySize) {
            this.filePaths.pop()
        }
        this._save()
    }

    clear() {
        this.filePaths.length = 0
        this.add(navigation.currentFilePath())
        this._save()
    }

    updateSize() {
        const oldSize = this.filePaths.length
        const sizeDifference = oldSize - loadApplicationSettings().fileHistorySize
        if (sizeDifference <= 0) {
            return
        }
        this.filePaths.splice(oldSize - sizeDifference, sizeDifference)
        this._save()
    }
}

class Content {
    _documents

    url
    isBlocked

    constructor(url, isBlocked = true, documents = new Set()) {
        this.url = url
        this.isBlocked = isBlocked
        this.documents = documents
    }

    get documents() {
        return this._documents
    }

    set documents(value) {
        this._documents = value instanceof Set ? value : new Set(value)
    }

    addDocument(document) {
        this.documents.add(document)
    }

    toObject() {
        return {
            [contentBlocking.URL_STORAGE_KEY]: this.url,
            [contentBlocking.IS_BLOCKED_STORAGE_KEY]: this.isBlocked,
            [contentBlocking.DOCUMENTS_STORAGE_KEY]: [...this.documents],
        }
    }

    static fromObject(obj) {
        return new Content(
            obj[contentBlocking.URL_STORAGE_KEY],
            obj[contentBlocking.IS_BLOCKED_STORAGE_KEY],
            obj[contentBlocking.DOCUMENTS_STORAGE_KEY],
        )
    }
}

class ContentBlocking extends StorageBase {
    #CONTENTS_KEY = "contents"

    contents = []

    constructor(storageDir, storageFile) {
        super(CONTENT_BLOCKING_VERSION, storageDir, storageFile)
        this.contents = (this._data[this.#CONTENTS_KEY] ?? []).map(Content.fromObject)
    }

    save(url, isBlocked, originDocuments) {
        let content = this._findContent(url)
        if (!content) {
            content = new Content(url)
            this.contents.push(content)
        }
        content.isBlocked = isBlocked
        content.documents = originDocuments
        this._save()
    }

    toObject() {
        return this.contents.map(content => content.toObject())
    }

    _findContent(url) {
        return this.contents.find(content => content.url === url)
    }

    _save() {
        this._data[this.#CONTENTS_KEY] = this.toObject()
        super._save()
    }
}

function loadApplicationSettings() {
    return (
        _applicationSettings ??
        (_applicationSettings = new ApplicationSettings(_dataDir, APPLICATION_SETTINGS_FILE))
    )
}

exports.init = (dataDir, electronMock) => {
    electron = electronMock ?? require("electron")
    exports.dataDir = _dataDir = dataDir
}

exports.loadApplicationSettings = loadApplicationSettings

exports.loadDocumentSettings = documentPath => {
    documentPath ??= navigation.currentFilePath()
    return (
        _documentSettings[documentPath] ??
        (_documentSettings[documentPath] = new DocumentSettings(
            _dataDir,
            DOCUMENT_SETTINGS_FILE,
            documentPath,
        ))
    )
}

exports.loadFileHistory = () =>
    _fileHistory ?? (_fileHistory = new FileHistory(_dataDir, FILE_HISTORY_FILE))

exports.loadContentBlocking = () =>
    _contentBlocking ?? (_contentBlocking = new ContentBlocking(_dataDir, CONTENT_BLOCKING_FILE))

exports.reset = () => {
    _applicationSettings = _fileHistory = _contentBlocking = null
    _documentSettings = {}
}
