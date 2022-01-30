const fs = require("fs")

const common = require("./common")
const log = require("./log/log")

function readBytesSync(filePath, filePosition, numBytesToRead) {
    // Based on https://stackoverflow.com/a/51033457 (Reading data a block at a time, synchronously)
    const buffer = Buffer.alloc(numBytesToRead, 0)
    let fd
    let bytesRead = 0
    try {
        fd = fs.openSync(filePath, "r")
        bytesRead = fs.readSync(fd, buffer, 0, numBytesToRead, filePosition)
    } finally {
        if (fd) {
            fs.closeSync(fd)
        }
    }
    return {
        bytesRead: bytesRead,
        buffer: buffer,
    }
}

exports.isMarkdown = filePath =>
    common.FILE_EXTENSIONS.map(ext => "." + ext).some(ext => filePath.toLowerCase().endsWith(ext))

exports.isText = filePath => {
    const BYTECOUNT = 50000
    let data
    try {
        data = readBytesSync(filePath, 0, BYTECOUNT)
    } catch (err) {
        log.error(err.message)
        return false
    }

    // It is not expected that an ASCII file contains control characters.
    // Space character is the first printable ASCII character.
    // Line breaks (LF = 10, CR = 13) and tabs (TAB = 9) are common in text files.
    return data.buffer
        .slice(0, data.bytesRead - 1)
        .every(byte => byte >= 32 || [10, 13, 9].includes(byte))
}
