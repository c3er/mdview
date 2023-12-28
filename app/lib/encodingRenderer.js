// Based on encoding module in VS Code
// File: extensions/git/src/encoding.ts
// Commit: 66b1668b66768275b655cde14d96203915feca7b

const iconv = require("iconv-lite")
const jschardet = require("jschardet")

const encodingShared = require("./encodingShared")

exports.detect = buffer => {
    const encoding = jschardet.detect(buffer)?.encoding
    return encoding ? encodingShared.normalize(encoding) : "utf8"
}

exports.decode = iconv.decode
