exports.APPLICATION_NAME = "Markdown Viewer"

exports.FILE_EXTENSIONS = ["md", "markdown"]

exports.SYSTEM_THEME = "system"

exports.LIGHT_THEME = "light"

exports.DARK_THEME = "dark"

exports.ZOOM_DEFAULT = 1.0

exports.isWebURL = url =>
    !url.startsWith("file://") && !url.startsWith("devtools://") && url.includes("://")

exports.prepareUrl = url => {
    if (!url) {
        return ""
    }
    const parts = url.split("#")
    const preparedUrl = parts[0].replaceAll("\\", "/").replaceAll("file://", "")
    return parts.length > 1 ? `${preparedUrl}#${parts.slice(1).join("#")}` : preparedUrl
}

// Source: https://stackoverflow.com/a/32108184 (How do I test for an empty JavaScript object?)
exports.isEmptyObject = obj => Object.keys(obj).length === 0 && obj.constructor === Object

exports.isRendererProcess = process && process.type === "renderer"

exports.isMacOS = () => process.platform === "darwin"
