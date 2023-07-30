const assert = require("chai").assert

const lib = require("./testLib")
const mocking = require("./mocking")

describe("Encoding library", () => {
    describe("Main part", () => {
        const encodingLib = require("../app/lib/encoding/encodingMain")
        const ipc = require("../app/lib/ipc/ipcMain")
        const storage = require("../app/lib/main/storage")

        const encoding = "utf16le"
        const filename = "testfile"

        beforeEach(() => {
            storage.init(mocking.dataDir, mocking.electron)
            encodingLib.init(mocking.mainMenu)
        })

        afterEach(async () => await lib.removeDataDir())

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
            mocking.send.ipc.toMain(message, null, filename, encoding)
        })
    })

    describe("Renderer part", () => {
        const encodingLib = require("../app/lib/encoding/encodingRenderer")

        const iso88592Encoding = "iso88592"
        const iso88592Buffer = Buffer.from(
            "\x4d\xfc\x6c\x6c\x65\x72\x20\x53\x74\x72\x61\xdf\x65",
            "binary",
        )

        it("detects ISO-8859-2 encoded bytes", () => {
            assert.equal(encodingLib.detect(iso88592Buffer), iso88592Encoding)
        })

        it("decodes ISO-8859-2 encoded bytes", () => {
            assert.equal(encodingLib.decode(iso88592Buffer, iso88592Encoding), "Müller Straße")
        })
    })
})
