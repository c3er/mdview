const path = require("path")

const assert = require("chai").assert
const lodashClonedeep = require("lodash.clonedeep")

const DEFAULT_THEME = "light"

class IpcChannel {
    _targetCallbacks = []
    _sourceAssertionCallbacks = []
    _targetAssertionCallbacks = []

    send(message) {
        this._targetCallbacks.forEach(callback => callback(message))
        this._sourceAssertionCallbacks.forEach(callback => callback(message))
        this._targetAssertionCallbacks.forEach(callback => callback(message))
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

    send(message) {
        if (!this._data.hasOwnProperty(message)) {
            assert.fail(`Message "${message}" is not registered in channel "${this.name}"`)
        }
        this._data[message].send(message)
    }

    clear() {
        this._data = {}
    }

    _addCallback(message, callback, addMethod) {
        if (this._data.hasOwnProperty(message)) {
            addMethod(this._data[message], callback)
        } else {
            const channel = new IpcChannel()
            addMethod(channel, callback)
            this._data[message] = channel
        }
    }
}

const _ipcToMainChannels = new IpcChannelCollection("to-main-channel")
const _ipcTorendererChannels = new IpcChannelCollection("to-renderer-channel")

const electronDefault = {
    ipcMain: {
        on(message, callback) {
            _ipcToMainChannels.addTarget(message, callback)
        },
    },
    ipcRenderer: {
        on(message, callback) {
            _ipcTorendererChannels.addTarget(message, callback)
        },
        send(message) {
            _ipcToMainChannels.send(message)
        },
    },
    nativeTheme: {
        themeSource: DEFAULT_THEME,
    },
}

const _htmlElement = {
    attributes: [],
    hidden: false,
    style: {
        display: "invalid-value",
    },
}

function resetElectron() {
    exports.electron = lodashClonedeep(electronDefault)
}

exports.DEFAULT_THEME = DEFAULT_THEME

exports.dataDir = path.join(__dirname, "data")

exports.elements = {
    mainMenu: {
        file: {
            label: "File",
            sub: {
                open: {
                    label: "Open",
                    isEnabled: true,
                },
                print: {
                    label: "Print",
                    isEnabled: true,
                },
                quit: {
                    label: "Quit",
                    isEnabled: true,
                },
            },
        },
        edit: {
            label: "Edit",
            sub: {
                copy: {
                    label: "Copy",
                    isEnabled: true,
                },
            },
        },
        view: {
            label: "View",
            sub: {
                refresh: {
                    label: "Refresh",
                    isEnabled: true,
                },
                unblock: {
                    label: "Unblock All External Content",
                    isEnabled: true,
                },
                rawText: {
                    label: "View Raw Text",
                    isEnabled: true,
                },
                switchTheme: {
                    label: "Switch Theme",
                    isEnabled: true,
                },
            },
        },
        encoding: {
            label: "Encoding",
            sub: {},
        },
        tools: {
            label: "Tools",
            sub: {
                developer: {
                    label: "Developer Tools",
                    isEnabled: true,
                },
            },
        },
    },
    blockedContentArea: {
        path: "//div[@id='blocked-content-info']",
        closeButton: {
            path: "//span[@id='blocked-content-info-close-button']",
        },
    },
    rawText: {
        path: "//div[@id='raw-text']",
    },
}

exports.mainWindow = {
    webContents: {
        send(message) {
            _ipcTorendererChannels.send(message)
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
    getElementById() {
        return lodashClonedeep(_htmlElement)
    },
    getElementsByTagName() {
        return [lodashClonedeep(_htmlElement)]
    },
}

exports.resetElectron = resetElectron

exports.register = {
    ipcMainOn(message, callback) {
        _ipcToMainChannels.addTargetAssertion(message, callback ?? (() => {}))
    },
    ipcRendererOn(message, callback) {
        _ipcTorendererChannels.addTargetAssertion(message, callback ?? (() => {}))
    },
    ipcRendererSend(message, callback) {
        _ipcToMainChannels.addSourceAssertion(message, callback ?? (() => {}))
    },
    webContentsSend(message, callback) {
        _ipcTorendererChannels.addSourceAssertion(message, callback ?? (() => {}))
    },
}

exports.send = {
    toMain(message) {
        _ipcToMainChannels.send(message)
    },
    toRenderer(message) {
        _ipcTorendererChannels.send(message)
    },
}

exports.clear = () => {
    _ipcToMainChannels.clear()
    _ipcTorendererChannels.clear()
}

resetElectron()
