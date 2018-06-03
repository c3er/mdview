exports.isWebURL =
    url =>
        !url.startsWith("file://") &&
        !url.startsWith("chrome-devtools://") &&
        url.includes("://")
