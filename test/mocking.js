const lodashClonedeep = require("lodash.clonedeep")
const path = require("path")

const DEFAULT_THEME = "light"

const electronDefault = {
    nativeTheme: {
        themeSource: DEFAULT_THEME,
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

exports.resetElectron = resetElectron

resetElectron()
