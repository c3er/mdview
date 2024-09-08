const assert = require("assert")

const mocking = require("./mocking")

describe("Error dialog", () => {
    describe("Main part", () => {
        const error = require("../app/lib/errorMain")
        const log = require("../app/lib/logMain")

        const errorMessage = "This is an error"

        let process

        beforeEach(() => {
            process = mocking.createProcess()
            log.init(true)
            error.init(process, mocking.electron)
        })

        afterEach(() => log.reset())

        it("logs the error message", () => {
            error.show(errorMessage)
            assert(log.errorMessages.some(msg => msg[1] === errorMessage))
        })

        it("causes process exit with non zero exit code", () => {
            error.show(errorMessage)

            assert(process.exitCalled)
            assert.notStrictEqual(process.exitCode, 0)
        })
    })

    describe("Renderer part", () => {
        const dialog = require("../app/lib/dialogRenderer")
        const error = require("../app/lib/errorRenderer")

        beforeEach(() => {
            dialog.reset()
            error.init(mocking.document)
        })

        it("is closed by default", () => {
            assert(!dialog.isOpen())
            assert(dialog.current() === null)
        })

        it('is open after "show" call', () => {
            error.show("Some message")
            assert(dialog.isOpen())
            assert.strictEqual(dialog.current().id, error.DIALOG_ID)
        })

        it("is closed after opening and closing", () => {
            error.show("Some message")
            assert(dialog.isOpen())
            assert.strictEqual(dialog.current().id, error.DIALOG_ID)

            dialog.close()
            assert(!dialog.isOpen())
            assert(dialog.current() === null)
        })
    })
})
