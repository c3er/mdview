const fs = require("fs/promises")
const path = require("path")

const mocking = require("./mocking")

const DEFAULT_DOCUMENT_FILE = "testfile_without-mermaid.md"
const DEFAULT_DOCUMENT_DIR = path.join(__dirname, "documents")

exports.DEFAULT_DOCUMENT_FILE = DEFAULT_DOCUMENT_FILE

exports.DEFAULT_DOCUMENT_DIR = DEFAULT_DOCUMENT_DIR

exports.DEFAULT_DOCUMENT_PATH = path.join(DEFAULT_DOCUMENT_DIR, DEFAULT_DOCUMENT_FILE)

exports.removeDataDir = async () => await fs.rm(mocking.dataDir, { force: true, recursive: true })

exports.prepareMdContent = content =>
    content
        .split("\n")
        .map(line => line.trimStart())
        .join("\n")
        .trim()

exports.isNear = (number1, number2, tolerance) =>
    number1 > number2 - tolerance && number1 < number2 + tolerance
