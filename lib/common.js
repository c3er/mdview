exports.isWebURL = url => !url.startsWith("file://") && url.includes("://")
