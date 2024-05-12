exports.APPLICATION_NAME = "Markdown Viewer"

exports.FILE_EXTENSIONS = ["md", "markdown"]

exports.SYSTEM_THEME = "system"

exports.LIGHT_THEME = "light"

exports.DARK_THEME = "dark"

exports.ZOOM_DEFAULT = 1.0

exports.isWebURL = url =>
    !url.startsWith("file://") && !url.startsWith("devtools://") && url.includes("://")

exports.prepareUrl = url =>
    Boolean(url) ? url.replaceAll("\\", "/").replaceAll("file://", "") : ""

// Source: https://stackoverflow.com/a/32108184 (How do I test for an empty JavaScript object?)
exports.isEmptyObject = obj => Object.keys(obj).length === 0 && obj.constructor === Object

exports.isRendererProcess = process && process.type === "renderer"

// Based on https://stackoverflow.com/a/70250484 (how to enumerate/discover getters and setters in javascript?)
exports.listGettersWithSetters = instance =>
    Object.entries(Object.getOwnPropertyDescriptors(Reflect.getPrototypeOf(instance)))
        .filter(
            ([name, descriptor]) =>
                typeof descriptor.get === "function" &&
                typeof descriptor.set === "function" &&
                name !== "__proto__",
        )
        .map(([name]) => name)

exports.isMacOS = () => process.platform === "darwin"
