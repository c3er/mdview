const assert = require("chai").assert

const common = require("../app/lib/common")

describe('Library "common"', () => {
    describe("common.isWebURL", () => {
        it("recognizes HTTP URLs", () => {
            assert.isTrue(common.isWebURL("http://example.com"))
            assert.isTrue(common.isWebURL("https://example.com"))
            assert.isTrue(common.isWebURL("http://placekitten.com/1000/2000"))
        })

        it("recognizes FTP URLs", () => {
            assert.isTrue(common.isWebURL("ftp://user:password@host:port/path"))
            assert.isTrue(common.isWebURL("ftp://ftp.funet.fi/pub/standards/RFC/rfc959.txt"))
        })

        it("does not recognize file URLs", () => {
            assert.isFalse(common.isWebURL("file:///C:/Windows/regedit.exe"))
        })

        it("does not recognize devtools URLs", () => {
            assert.isFalse(common.isWebURL("devtools://devtools/bundled/root.js"))
        })
    })

    describe("common.isEmptyObject", () => {
        it("recognizes an empty object", () => {
            assert.isTrue(common.isEmptyObject({}))
        })

        it("does not recognize objects with content", () => {
            assert.isFalse(
                common.isEmptyObject({
                    foo: "bar",
                })
            )
        })
    })
})
