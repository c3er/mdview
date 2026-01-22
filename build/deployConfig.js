const APPLICATION_NAME = "Markdown Viewer"
const APPLICATION_SHORTNAME = "mdview"
const WIN_ICON = "app/assets/icon/md.ico"
const MAC_ICON = "app/assets/icon/md.icns"
const RESPOURCE_FILES = ["README.md", "CONTRIBUTING.md", "CHANGELOG.md", "LICENSE", "doc/**"]

module.exports = {
    productName: APPLICATION_NAME,
    executableName: APPLICATION_SHORTNAME,
    artifactName: "${name}-${version}-${arch}.${ext}",
    afterPack: "build/afterPack.js",
    afterAllArtifactBuild: "build/afterAllArtifactBuild.js",
    files: [
        "!**/node_modules/**/{test,__tests__,tests,powered-test,example,examples}",
        "!**/*/{.eslintrc.json,.eslintrc.js,.eslintignore,.nvmrc,tsconfig.json,.stylelintrc.json,.prettierignore,.prettierrc,.prettierrc.json,.babelrc,babel.config.js,bower.json,webpack.config.js,.browserslist,rollup.config.js,.editorconfig}",
        "!**/node_modules/**/*.{md,ts,map,png,jpg,jpeg,gif,avi,mov,mp3}",
        "!.data/*",
        "!.storage/*",
        "!.vscode/*",
        "!test/*",
        "!build/*",
        "!tmp/*",
        "!.eslintrc.js",
        "!.prettier*",
        "!tmp.md",
        "!*.log",
        ...RESPOURCE_FILES.map(file => `!${file}`),
    ],
    extraResources: RESPOURCE_FILES,
    msi: {
        createDesktopShortcut: false,
        oneClick: false,
        shortcutName: APPLICATION_NAME,
    },
    nsis: {
        allowElevation: true,
        allowToChangeInstallationDirectory: true,
        createDesktopShortcut: false,
        license: "LICENSE",
        oneClick: false,
        perMachine: false,
        shortcutName: APPLICATION_NAME,
    },
    dmg: {
        title: APPLICATION_NAME,
    },
    linux: {
        target: ["AppImage"],
    },
    mac: {
        target: ["dmg"],
        category: "public.app-category.utilities",
        icon: MAC_ICON,
    },
    win: {
        target: ["msi", "nsis", "zip"],
        icon: WIN_ICON,
        extraFiles: [
            {
                from: "build/assets",
                to: ".",
                filter: ["**/*"],
            },
        ],
    },
    fileAssociations: [
        {
            name: "Markdown file",
            ext: ".md",
            icon: WIN_ICON,
        },
        {
            name: "Markdown file",
            ext: ".markdown",
            icon: WIN_ICON,
        },
    ],
}
