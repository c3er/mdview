const assert = require("chai").assert

const mocking = require("./mocking")

describe("Error dialog", () => {
    describe("Main part", () => {
        const error = require("../app/lib/error/errorMain")
        const log = require("../app/lib/log/logMain")

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
            assert.isTrue(log.errorMessages.some(msg => msg[1] === errorMessage))
        })

        it("causes process exit with non zero exit code", () => {
            error.show(errorMessage)

            assert.isTrue(process.exitCalled)
            assert.notStrictEqual(process.exitCode, 0)
        })
    })

    describe("Renderer part", () => {
        const error = require("../app/lib/error/errorRenderer")

        beforeEach(() => error.init(mocking.document))

        it("is closed by default", () => {
            assert.isFalse(error.isOpen())
        })

        it('is open after "show" call', () => {
            error.show("Some message")
            assert.isTrue(error.isOpen())
        })

        it("is closed after opening and closing", () => {
            error.show("Some message")
            error.close()

            assert.isFalse(error.isOpen())
        })
    })
})
