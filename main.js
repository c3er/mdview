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
    }
    mainWindow.webContents.send("fileOpen", filePath)
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
            }
        ])
    )

    globalShortcut.register("F10", () => mainWindow.webContents.openDevTools())
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
    const args = process.argv.slice(2)
    if (args.length === 1) {
        openFile(args[0])
    } else if (args.length > 1) {
        error("More than one argument given")
    } else {
        openFile(path.join(__dirname, "README.md"))
    }
})
