const assert = require("assert")
const path = require("path")

const lib = require("./testLib")

const file = require("../app/lib/file")

describe('Library "file"', () => {
    const mdFilePath = lib.DEFAULT_DOCUMENT_PATH
    const nonMdFilePath = path.join(__dirname, "mocking.js")
    const binFilePath = path.join(__dirname, "documents", "font1", "Daedric.ttf")

    describe("file.isText", () => {
        it("recognizes a Markdown file", () => {
            assert(file.isText(mdFilePath))
        })

        it("recognizes a non Markdown file", () => {
            assert(file.isText(nonMdFilePath))
        })

        it("does not recognize a binary file", () => {
            assert(!file.isText(binFilePath))
        })
    })

    describe("file.isMarkdown", () => {
        it("recognizes a Markdown file", () => {
            assert(file.isMarkdown(mdFilePath))
        })

        it("recognizes a non Markdown file", () => {
            assert(!file.isMarkdown(nonMdFilePath))
        })
    })

    describe("file.isAbsolutePath", () => {
        it("recognizes absolute paths", () => {
            for (const filePath of [
                "C:\\path\\to\\file.md",
                "E:/path/to/file.md",
                "/path/to/file.md",
            ]) {
                assert(file.isAbsolutePath(filePath))
            }
        })

        it("does not recognize relative paths", () => {
            for (const filePath of ["path/to/file.md", "path\\to\\file.md", "file.md"]) {
                assert(!file.isAbsolutePath(filePath))
            }
        })
    })

    describe("file.transformRelativePath", () => {
        it("decodes URL-encoded relative paths", () => {
            assert.strictEqual(
                file.transformRelativePath("C:\\docs\\计划", "../%E8%AF%81%E6%8D%AE/note.md"),
                path.join("C:\\docs\\计划", "../证据/note.md"),
            )
        })

        it("decodes Unicode filenames", () => {
            assert.strictEqual(
                file.transformRelativePath("C:\\docs", "./%E8%AE%A1%E5%88%92.md"),
                path.join("C:\\docs", "./计划.md"),
            )
        })

        it("decodes spaces in relative paths", () => {
            assert.strictEqual(
                file.transformRelativePath("C:\\docs", "../My%20Docs/file.md"),
                path.join("C:\\docs", "../My Docs/file.md"),
            )
        })

        it("keeps malformed relative paths unchanged", () => {
            assert.strictEqual(
                file.transformRelativePath("C:\\docs", "../%GG/file.md"),
                path.join("C:\\docs", "../%GG/file.md"),
            )
        })

        it("keeps ASCII relative paths unchanged", () => {
            assert.strictEqual(
                file.transformRelativePath("C:\\docs", "../other.md"),
                path.join("C:\\docs", "../other.md"),
            )
        })
    })
})
