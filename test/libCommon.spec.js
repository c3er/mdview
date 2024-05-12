const assert = require("assert")

const common = require("../app/lib/common")

describe('Library "common"', () => {
    describe("common.isWebURL", () => {
        it("recognizes HTTP URLs", () => {
            assert(common.isWebURL("http://example.com"))
            assert(common.isWebURL("https://example.com"))
            assert(common.isWebURL("http://placekitten.com/1000/2000"))
        })

        it("recognizes FTP URLs", () => {
            assert(common.isWebURL("ftp://user:password@host:port/path"))
            assert(common.isWebURL("ftp://ftp.funet.fi/pub/standards/RFC/rfc959.txt"))
        })

        it("does not recognize file URLs", () => {
            assert(!common.isWebURL("file:///C:/Windows/regedit.exe"))
        })

        it("does not recognize devtools URLs", () => {
            assert(!common.isWebURL("devtools://devtools/bundled/root.js"))
        })
    })

    describe("common.prepareUrl", () => {
        it("replaces all backslashes", () => {
            assert.strictEqual(common.prepareUrl("path\\to\\file"), "path/to/file")
        })

        it("removes file protocol prefix", () => {
            assert.strictEqual(common.prepareUrl("file:///path/to/file"), "/path/to/file")
        })

        it("does nothing with an empty string", () => {
            assert.strictEqual(common.prepareUrl(""), "")
        })

        it("converts null to empty string", () => {
            assert.strictEqual(common.prepareUrl(null), "")
        })

        it("converts undefined to empty string", () => {
            assert.strictEqual(common.prepareUrl(undefined), "")
        })
    })

    describe("common.isEmptyObject", () => {
        it("recognizes an empty object", () => {
            assert(common.isEmptyObject({}))
        })

        it("does not recognize objects with content", () => {
            assert(
                !common.isEmptyObject({
                    foo: "bar",
                }),
            )
        })
    })
})
