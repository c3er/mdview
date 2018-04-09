const { app, BrowserWindow, Menu, globalShortcut, ipcMain, dialog } = require("electron")
const path = require("path")
const url = require("url")

const WINDOW_WIDTH = 1024
const WINDOW_HEIGHT = 768

let mainWindow

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

    globalShortcut.register("CommandOrControl+O", () => {
        dialog.showOpenDialog(
            {
                properties: ["openFile"],
                filters: [{ name: "Markdown", extensions: ["md", "markdown"] }]
            },
            filePaths => {
                if (filePaths) {
                    mainWindow.webContents.send("fileOpen", filePaths[0])
                }
            }
        )
    })
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
