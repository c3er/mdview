const { app, BrowserWindow, Menu, globalShortcut, ipcMain, dialog } = require("electron")
const path = require("path")
const url = require("url")
const fs = require("fs")

const WINDOW_WIDTH = 1024
const WINDOW_HEIGHT = 768

let mainWindow

function error(msg) {
    dialog.showErrorBox("Error", `${msg}. Exiting.`)
    process.exit(1)
}

function openFile(filePath) {
    if (!fs.existsSync(filePath)) {
        error("Unknown file")
    } else if (!fs.lstatSync(filePath).isFile()) {
        error("Given path leads to directory")
    } else {
        mainWindow.webContents.send("fileOpen", filePath)
    }
}

function extractFilePath(args) {
    for (let i = 0; i < args.length; i++) {
        let arg = args[i]
        if (!arg.includes("electron") && !arg.startsWith("-") && arg != "." && arg != process.execPath) {
            return arg
        }
    }
}

function createWindow() {
    mainWindow = new BrowserWindow({
        width: WINDOW_WIDTH,
        height: WINDOW_HEIGHT
    })
    mainWindow.loadURL(
        url.format({
            pathname: path.join(__dirname, "index.html"),
            protocol: "file:",
            slashes: true
        })
    )
    mainWindow.on("closed", () => {
        mainWindow = null
    })

    Menu.setApplicationMenu(
        Menu.buildFromTemplate([
            {
                label: "File",
                submenu: [
                    {
                        label: "Open",
                        accelerator: "CmdOrCtrl+O",
                        click: () => {
                            dialog.showOpenDialog(
                                {
                                    properties: ["openFile"],
                                    filters: [{ name: "Markdown", extensions: ["md", "markdown"] }]
                                },
                                filePaths => {
                                    if (filePaths) {
                                        openFile(filePaths[0])
                                    }
                                }
                            )
                        }
                    },
                    {
                        label: "Quit",
                        accelerator: process.platform === "darwin" ? "Cmd+Q" : "Alt+F4",
                        click: () => mainWindow.close()
                    }
                ]
            },
            {
                label: "Tools",
                submenu: [
                    {
                        label: "Developer tools",
                        accelerator: "F10",
                        click: () => mainWindow.webContents.openDevTools()
                    }
                ]
            }
        ])
    )
}

app.on("ready", createWindow)

app.on("window-all-closed", () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== "darwin") {
        app.quit()
    }
})

app.on("activate", () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow()
    }
})

ipcMain.on("finishLoad", () => {
    const filePath = extractFilePath(process.argv)
    if (filePath !== undefined) {
        openFile(filePath)
    } else {
        openFile(path.join(__dirname, "../README.md"))
    }
})
