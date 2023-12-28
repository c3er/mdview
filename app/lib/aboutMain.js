const path = require("path")

const common = require("./common")
const ipc = require("./ipcMain")
const menu = require("./main/menu")
const packageJson = require("./main/packageJson")

const ABOUT_DIALOG_MENU_ID = "about"

exports.ABOUT_DIALOG_MENU_ID = ABOUT_DIALOG_MENU_ID

exports.init = mainMenu =>
    ipc.listen(ipc.messages.aboutDialogIsOpen, isOpen =>
        menu.setEnabled(mainMenu, ABOUT_DIALOG_MENU_ID, !isOpen),
    )

exports.open = () => {
    const packageInfo = packageJson.obj()
    ipc.send(ipc.messages.about, {
        applicationIconPath: path.join(
            __dirname,
            "..",
            "assets",
            "icon",
            common.isMacOS() ? "md-mac-icon.svg" : "md-icon.svg",
        ),
        applicationName: common.APPLICATION_NAME,
        applicationDescription: packageInfo.description,
        applicationVersion: packageInfo.version,
        homepage: packageInfo.homepage,
        issueLink: packageInfo.bugs.url,

        // Based on electron-about-window: https://github.com/rhysd/electron-about-window
        // File src/renderer.ts, commit ID 9dc88da999d64e9a614d33adf649d566c0a35fcb
        frameworkVersions: ["electron", "chrome", "node", "v8"].map(framework => [
            framework,
            process.versions[framework],
        ]),
    })
}
