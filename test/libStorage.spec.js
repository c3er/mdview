const assert = require("assert")

const lib = require("./testLib")
const mocking = require("./mocking")

const common = require("../app/lib/common")

const storage = require("../app/lib/storageMain")

async function initStorage() {
    await lib.removeDataDir()
    storage.reset()
    storage.init(mocking.dataDir, mocking.electron)
}

describe("Storage", () => {
    describe("Application settings", () => {
        let applicationSettings

        beforeEach(async () => {
            await initStorage()
            applicationSettings = storage.loadApplicationSettings()
        })

        it("has default Markdown endings", () => {
            assert.deepStrictEqual(applicationSettings.mdFileTypes, common.FILE_EXTENSIONS)
        })
    })

    describe("File history", () => {
        let applicationSettings
        let fileHistory

        function addFiles(files) {
            for (const file of files) {
                fileHistory.add(file)
            }
            assert(fileHistory.hasFiles())
        }

        beforeEach(async () => {
            await initStorage()

            applicationSettings = storage.loadApplicationSettings()
            fileHistory = storage.loadFileHistory()
        })

        it("is empty by default", () => {
            assert.strictEqual(fileHistory.filePaths.length, 0)
            assert(!fileHistory.hasFiles())
        })

        it("remembers files", () => {
            const files = ["File 1", "File 2", "File 3"]
            addFiles(files)
            assert.deepEqual(fileHistory.filePaths, files.reverse())
        })

        it("has a maximum number of files", () => {
            const files = ["File 1", "File 2", "File 3", "File 4", "File 5"]
            const historySize = (applicationSettings.fileHistorySize = 3)

            addFiles(files)

            const fileCount = files.length
            assert.deepEqual(
                fileHistory.filePaths,
                files.reverse().slice(0, fileCount - (fileCount - historySize)),
            )
        })

        it("has only unique entries", () => {
            addFiles(["File 1", "File 2", "File 1"])
            assert.deepEqual(fileHistory.filePaths, ["File 1", "File 2"])
        })
    })
})
