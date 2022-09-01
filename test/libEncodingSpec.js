const assert = require("chai").assert

const mocking = require("./mocking")

describe("Encoding library", () => {
    describe("Main part", () => {
        const ipc = require("../app/lib/ipc/ipcMain")
        const encodingLib = require("../app/lib/encoding/encodingMain")

        const encoding = "utf16le"
        const filename = "testfile"

        beforeEach(() => encodingLib.init(mocking.mainMenu))

        it("remembers the encoding", () => {
            encodingLib.change(filename, encoding)
            assert.equal(encodingLib.load(filename), encoding)
        })

        it("reacts to changeEncoding IPC message", () => {
            const message = ipc.messages.changeEncoding
            mocking.register.ipc.mainOn(message, (_, filePath, actualEncoding) => {
                assert.equal(filePath, filename)
                assert.equal(actualEncoding, encoding)
            })
            mocking.send.ipc.toMain(message, mocking.electronIpcEvent, filename, encoding)
        })
    })

    describe("Renderer part", () => {
        const encodingLib = require("../app/lib/encoding/encodingRenderer")

        const iso88592Encoding = "iso88592"
        const iso88592Buffer = Buffer.from(
            "\x4d\xfc\x6c\x6c\x65\x72\x20\x53\x74\x72\x61\xdf\x65",
            "binary"
        )

        it("detects ISO-8859-2 encoded bytes", () => {
            assert.equal(encodingLib.detect(iso88592Buffer), iso88592Encoding)
        })

        it("decodes ISO-8859-2 encoded bytes", () => {
            assert.equal(encodingLib.decode(iso88592Buffer, iso88592Encoding), "Müller Straße")
        })
    })
})
