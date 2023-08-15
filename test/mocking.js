const path = require("path")

const assert = require("chai").assert
const lodashClonedeep = require("lodash.clonedeep")

const DEFAULT_THEME = "system"

const _electronIpcEvent = {}

const _defaultHtmlElement = {
    attributes: [],
    hidden: false,
    innerHTML: "",
    innerText: "",
    returnValue: null,
    style: {
        display: "invalid-value",
    },
    value: "",
    addEventListener() {},
    close() {},
    onauxclick() {},
    onclick() {},
    removeAttribute() {},
    setAttribute() {},
    setSelectionRange() {},
    showModal() {},
}
let _htmlElement = null

class Event {
    preventDefaultIsCalled = false

    preventDefault() {
        this.preventDefaultIsCalled = true
    }
}

class Process {
    exitCalled = false
    exitCode = 0

    exit(code) {
        this.exitCalled = true
        this.exitCode = code
    }
}

class WebRequestChannel {
    constructor() {
        this.clear()
    }

    clear() {
        this._callback = () => {}
        this._assertionCallback = () => {}
    }

    send(details, callback) {
        this._callback(details, callback)
        this._assertionCallback(details, callback)
    }

    register(callback) {
        this._callback = callback
    }

    registerAssertion(callback) {
        this._assertionCallback = callback
    }
}

class IpcChannel {
    _targetCallbacks = []
    _sourceAssertionCallbacks = []
    _targetAssertionCallbacks = []

    send(event, ...args) {
        this._targetCallbacks.forEach(callback => callback(event, ...args))
        this._sourceAssertionCallbacks.forEach(callback => callback(event, ...args))
        this._targetAssertionCallbacks.forEach(callback => callback(event, ...args))
    }

    addTarget(callback) {
        this._targetCallbacks.push(callback)
    }

    addSourceAssertion(callback) {
        this._sourceAssertionCallbacks.push(callback)
    }

    addTargetAssertion(callback) {
        this._targetAssertionCallbacks.push(callback)
    }
}

class IpcChannelCollection {
    _data = {}

    name = ""

    constructor(name) {
        this.name = name
    }

    addTarget(message, callback) {
        this._addCallback(message, callback, channel => channel.addTarget(callback))
    }

    addSourceAssertion(message, callback) {
        this._addCallback(message, callback, channel => channel.addSourceAssertion(callback))
    }

    addTargetAssertion(message, callback) {
        this._addCallback(message, callback, channel => channel.addTargetAssertion(callback))
    }

    send(message, event, ...args) {
        if (!Object.hasOwn(this._data, message)) {
            assert.fail(`Message "${message}" is not registered in channel "${this.name}"`)
        }
        this._data[message].send(event, ...args)
    }

    clear() {
        this._data = {}
    }

    _addCallback(message, callback, addMethod) {
        if (Object.hasOwn(this._data, message)) {
            addMethod(this._data[message], callback)
        } else {
            const channel = new IpcChannel()
            addMethod(channel, callback)
            this._data[message] = channel
        }
    }
}

const _webRequestChannel = new WebRequestChannel()
const _webRequestRedirectChannel = new WebRequestChannel()

const _ipcToMainChannels = new IpcChannelCollection("to-main-channel")
const _ipcTorendererChannels = new IpcChannelCollection("to-renderer-channel")

const _electronDefault = {
    ipcMain: {
        on(message, callback) {
            _ipcToMainChannels.addTarget(message, callback)
        },
    },
    ipcRenderer: {
        on(message, callback) {
            _ipcTorendererChannels.addTarget(message, callback)
        },
        send(message, ...args) {
            _ipcToMainChannels.send(message, _electronIpcEvent, ...args)
        },
    },
    nativeTheme: {
        themeSource: DEFAULT_THEME,
    },
    session: {
        defaultSession: {
            webRequest: {
                onBeforeRequest(callback) {
                    _webRequestChannel.register(callback)
                },
                onBeforeRedirect(callback) {
                    _webRequestRedirectChannel.register(callback)
                },
            },
        },
    },
    dialog: {
        showErrorBox() {},
    },
}

function loadHtmlElement() {
    return _htmlElement ?? lodashClonedeep(_defaultHtmlElement)
}

function resetElectron() {
    exports.electron = lodashClonedeep(_electronDefault)
}

exports.DEFAULT_THEME = DEFAULT_THEME

exports.dataDir = path.join(__dirname, "data")

exports.elements = {
    mainMenu: {
        file: {
            label: "&File",
            isEnabled: true,
            sub: {
                open: {
                    label: "&Open",
                    isEnabled: true,
                },
                print: {
                    label: "&Print",
                    isEnabled: true,
                },
                quit: {
                    label: "&Quit",
                    isEnabled: true,
                },
            },
        },
        edit: {
            label: "&Edit",
            isEnabled: true,
            sub: {
                copy: {
                    label: "Copy",
                    isEnabled: true,
                },
                find: {
                    label: "&Find...",
                    isEnabled: true,
                },
                findNext: {
                    label: "Find &next",
                    isEnabled: false,
                },
                findPrevious: {
                    label: "Find &previous",
                    isEnabled: false,
                },
                settings: {
                    label: "&Settings...",
                    isEnabled: true,
                },
            },
        },
        view: {
            label: "&View",
            isEnabled: true,
            sub: {
                back: {
                    label: "&Back",
                    isEnabled: false,
                },
                forward: {
                    label: "&Forward",
                    isEnabled: false,
                },
                refresh: {
                    label: "&Refresh",
                    isEnabled: true,
                },
                unblock: {
                    label: "&Unblock All External Content",
                    isEnabled: true,
                },
                rawText: {
                    label: "&View Raw Text",
                    isEnabled: true,
                },
                toc: {
                    label: "Table Of &Content",
                    isEnabled: true,
                    sub: {
                        tocApplication: {
                            label: "Show For &All Documents",
                            isEnabled: true,
                            isChecked: false,
                        },
                        tocDocument: {
                            label: "Show For &This Document",
                            isEnabled: true,
                            isChecked: false,
                        },
                        forgetDocumentToc: {
                            label: "Forget Document Override",
                            isEnabled: false,
                        },
                    },
                },
                zoom: {
                    label: "&Zoom",
                    isEnabled: true,
                    sub: {
                        zoomIn: {
                            label: "Zoom &In",
                            isEnabled: true,
                        },
                        zoomOut: {
                            label: "Zoom &Out",
                            isEnabled: true,
                        },
                        resetZoom: {
                            label: "&Reset Zoom",
                            isEnabled: true,
                        },
                    },
                },
                theme: {
                    label: "&Theme",
                    isEnabled: true,
                    sub: [
                        {
                            label: "&System Default",
                            isEnabled: true,
                            isChecked: true,
                        },
                        {
                            label: "&Light",
                            isEnabled: true,
                            isChecked: false,
                        },
                        {
                            label: "&Dark",
                            isEnabled: true,
                            isChecked: false,
                        },
                    ],
                },
                markdownRendering: {
                    label: "Markdown Render &Options",
                    isEnabled: true,
                    sub: [
                        {
                            label: "Respect Single &Line Breaks",
                            isEnabled: true,
                            isChecked: false,
                        },
                        {
                            label: "Enable &Typographic Replacements",
                            isEnabled: true,
                            isChecked: true,
                        },
                        {
                            label: "Convert &Emoticons To Emojis",
                            isEnabled: true,
                            isChecked: true,
                        },
                        {
                            label: "Hide &Metadata Header",
                            isEnabled: true,
                            isChecked: false,
                        },
                    ],
                },
                renderFileAsMarkdown: {
                    label: "Render this file as Markdown",
                    isEnabled: true,
                    isChecked: false,
                },
                renderFileTypeAsMarkdown: {
                    label: "Render all files of this type as Markdown",
                    isEnabled: true,
                    isChecked: true,
                },
            },
        },
        encoding: {
            label: "En&coding",
            isEnabled: true,
            sub: {},
        },
        tools: {
            label: "&Tools",
            isEnabled: true,
            sub: {
                developer: {
                    label: "&Developer Tools",
                    isEnabled: true,
                },
                debug: {
                    label: "De&bug",
                    isEnabled: true,
                    sub: {
                        throwException: {
                            label: "Throw e&xception",
                            isEnabled: true,
                        },
                        showError: {
                            label: "Show &error dialog",
                            isEnabled: true,
                        },
                        softReload: {
                            label: "Soft &reload",
                            isEnabled: true,
                        },
                    },
                },
            },
        },
        help: {
            label: "&Help",
            isEnabled: true,
            sub: {
                about: {
                    label: "&About",
                    isEnabled: true,
                },
            },
        },
    },
    blockedContentArea: {
        path: "#blocked-content-info",
        textContainer: {
            path: "#blocked-content-info-text-container",
        },
        closeButton: {
            path: "#blocked-content-info-close-button",
        },
    },
    toc: {
        path: "#toc",
    },
    separator: {
        path: "#separator",
    },
    content: {
        path: "#content-body",
    },
    rawText: {
        path: "#raw-text",
    },
    searchDialog: {
        path: "#search-dialog",
        inputField: {
            path: "#search-input",
        },
        okButton: {
            path: "#search-ok-button",
        },
        cancelButton: {
            path: "#search-cancel-button",
        },
    },
    errorDialog: {
        path: "#error-dialog",
        okButton: {
            path: "#error-ok-button",
        },
    },
}

exports.mainWindow = {
    webContents: {
        send(message, ...args) {
            _ipcTorendererChannels.send(message, _electronIpcEvent, ...args)
        },
    },
}

exports.mainMenu = {
    getMenuItemById(id) {
        return {
            id: id,
            enabled: true,
        }
    },
}

exports.document = {
    body: {
        style: {
            marginTop: 0,
        },
    },
    documentElement: {
        scrollTop: 0,
    },
    getElementById() {
        return loadHtmlElement()
    },
    getElementsByClassName() {
        return [loadHtmlElement()]
    },
    getElementsByTagName() {
        return [loadHtmlElement()]
    },
}

exports.window = {
    getComputedStyle() {
        return {
            height: 0,
        }
    },
}

exports.createEvent = () => new Event()

exports.createProcess = () => new Process()

exports.loadHtmlElement = loadHtmlElement

exports.registerHtmlElement = element => (_htmlElement = element)

exports.resetHtmlElement = () => (_htmlElement = null)

exports.resetElectron = resetElectron

exports.register = {
    ipc: {
        mainOn(message, callback) {
            _ipcToMainChannels.addTargetAssertion(message, callback ?? (() => {}))
        },
        rendererOn(message, callback) {
            _ipcTorendererChannels.addTargetAssertion(message, callback ?? (() => {}))
        },
        rendererSend(message, callback) {
            _ipcToMainChannels.addSourceAssertion(message, callback ?? (() => {}))
        },
        webContentsSend(message, callback) {
            _ipcTorendererChannels.addSourceAssertion(message, callback ?? (() => {}))
        },
    },
    webRequest: {
        onBeforeRequest(callback) {
            _webRequestChannel.registerAssertion(callback)
        },
        onBeforeRedirect(callback) {
            _webRequestRedirectChannel.registerAssertion(callback)
        },
    },
}

exports.send = {
    ipc: {
        toMain(message, event, ...args) {
            _ipcToMainChannels.send(message, event, ...args)
        },
        toRenderer(message, event, ...args) {
            _ipcTorendererChannels.send(message, event, ...args)
        },
    },
    webRequest: {
        beforeRequest(details, callback) {
            _webRequestChannel.send(details, callback)
        },
        beforeRedirect(details) {
            _webRequestRedirectChannel.send(details)
        },
    },
}

exports.clear = () => {
    _webRequestChannel.clear()
    _webRequestRedirectChannel.clear()
    _ipcToMainChannels.clear()
    _ipcTorendererChannels.clear()
}

resetElectron()
