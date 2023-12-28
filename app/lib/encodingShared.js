exports.normalize = encoding => {
    encoding = encoding.replace(/[^a-zA-Z0-9]/g, "").toLowerCase()
    if (encoding === "ascii") {
        encoding = "utf8"
    }
    return encoding
}
