const assert = require("assert")

const lib = require("./testLib")
const mocking = require("./mocking")

describe("Encoding library", () => {
    describe("Main part", () => {
        const encodingLib = require("../app/lib/encodingMain")
        const ipc = require("../app/lib/ipcMain")
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
            assert.strictEqual(encodingLib.load(filename), encoding)
        })

        it("reacts to changeEncoding IPC message", () => {
            const message = ipc.messages.changeEncoding
            mocking.register.ipc.mainOn(message, (_, filePath, actualEncoding) => {
                assert.strictEqual(filePath, filename)
                assert.strictEqual(actualEncoding, encoding)
            })
            mocking.send.ipc.toMain(message, null, filename, encoding)
        })
    })

    describe("Renderer part", () => {
        const encodingLib = require("../app/lib/encodingRenderer")

        const iso88592Encoding = "iso88592"
        const iso88592Buffer = Buffer.from(
            "\x4d\xfc\x6c\x6c\x65\x72\x20\x53\x74\x72\x61\xdf\x65",
            "binary",
        )

        it("detects ISO-8859-2 encoded bytes", () => {
            assert.strictEqual(encodingLib.detect(iso88592Buffer), iso88592Encoding)
        })

        it("decodes ISO-8859-2 encoded bytes", () => {
            assert.strictEqual(
                encodingLib.decode(iso88592Buffer, iso88592Encoding),
                "Müller Straße",
            )
        })
    })
})
