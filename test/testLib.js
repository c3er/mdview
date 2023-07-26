const fs = require("fs/promises")

const mocking = require("./mocking")

exports.removeDataDir = async () => await fs.rm(mocking.dataDir, { force: true, recursive: true })

exports.prepareMdContent = content =>
    content
        .split("\n")
        .map(line => line.trimStart())
        .join("\n")
        .trim()
