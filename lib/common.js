exports.FILE_EXTENSIONS = ["md", "markdown"]

exports.isWebURL = url =>
    !url.startsWith("file://") &&
    !url.startsWith("chrome-devtools://") &&
    url.includes("://")

// Source: https://stackoverflow.com/a/32108184
exports.isEmptyObject = obj => Object.keys(obj).length === 0 && obj.constructor === Object
