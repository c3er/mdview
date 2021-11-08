// Based on encoding module in VS Code
// File: extensions/git/src/encoding.ts
// Commit: 66b1668b66768275b655cde14d96203915feca7b

const iconv = require("iconv-lite")
const jschardet = require("jschardet")

const encodingShared = require("./encodingShared")

const DEFAULT_ENCODING = "utf8"

function detectEncodingByBOM(buffer) {
    if (!buffer || buffer.length < 2) {
        return null
    }

    const b0 = buffer.readUInt8(0)
    const b1 = buffer.readUInt8(1)

    // UTF-16 BE
    if (b0 === 0xfe && b1 === 0xff) {
        return "utf16be"
    }

    // UTF-16 LE
    if (b0 === 0xff && b1 === 0xfe) {
        return "utf16le"
    }

    if (buffer.length < 3) {
        return null
    }

    const b2 = buffer.readUInt8(2)

    // UTF-8
    if (b0 === 0xef && b1 === 0xbb && b2 === 0xbf) {
        return "utf8"
    }

    return null
}

exports.detect = buffer => {
    const utfEncoding = detectEncodingByBOM(buffer)
    if (utfEncoding) {
        return utfEncoding
    }

    const encoding = jschardet.detect(buffer)?.encoding
    if (!encoding) {
        return DEFAULT_ENCODING
    }

    return encodingShared.normalize(encoding)
}

exports.decode = iconv.decode
