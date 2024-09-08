const assert = require("assert")

const dialog = require("../app/lib/dialogRenderer")

describe("Dialog", () => {
    beforeEach(dialog.reset)

    it("is closed by default", () => {
        assert(!dialog.isOpen())
        assert(dialog.current() === null)
    })

    it("can be opened", () => {
        const id = "test-id"
        dialog.open(
            id,
            () => {},
            () => {},
        )

        assert(dialog.isOpen())
        assert.strictEqual(dialog.current().id, id)
    })

    it("calls the proper callback at opening", () => {
        const id = "test-id"
        let openCallbackCallCount = 0
        dialog.open(
            id,
            () => openCallbackCallCount++,
            () => {},
        )

        assert(dialog.isOpen())
        assert.strictEqual(dialog.current().id, id)
        assert.strictEqual(openCallbackCallCount, 1)
    })

    it("can be closed", () => {
        const id = "test-id"
        dialog.open(
            id,
            () => {},
            () => {},
        )

        assert(dialog.isOpen())
        assert.strictEqual(dialog.current().id, id)

        dialog.close()
        assert(!dialog.isOpen())
        assert(dialog.current() === null)
    })

    it("calls the proper callback at opening", () => {
        const id = "test-id"
        let openCallbackCallCount = 0
        let closeCallbackCallCount = 0

        dialog.open(
            id,
            () => openCallbackCallCount++,
            () => closeCallbackCallCount++,
        )
        assert(dialog.isOpen())
        assert.strictEqual(dialog.current().id, id)
        assert.strictEqual(openCallbackCallCount, 1)
        assert.strictEqual(closeCallbackCallCount, 0)

        dialog.close()
        assert(!dialog.isOpen())
        assert(dialog.current() === null)
        assert.strictEqual(openCallbackCallCount, 1)
        assert.strictEqual(closeCallbackCallCount, 1)
    })

    it("can open and close multiple dialogs", () => {
        const ids = ["test1", "test2", "test3"]
        let openCallbackCallCount = 0
        let closeCallbackCallCount = 0

        for (const id of ids) {
            dialog.open(
                id,
                () => openCallbackCallCount++,
                () => closeCallbackCallCount++,
            )
            assert(dialog.isOpen())
            assert.strictEqual(dialog.current().id, id)
        }
        assert.strictEqual(openCallbackCallCount, ids.length)
        assert.strictEqual(closeCallbackCallCount, 0)

        const lastIdIndex = ids.length - 1
        for (let i = lastIdIndex; i >= 0; i--) {
            assert(dialog.isOpen())
            assert.strictEqual(dialog.current().id, ids[i])

            dialog.close()
            if (i > 0) {
                assert(dialog.isOpen())
                assert.strictEqual(dialog.current().id, ids[i - 1])
            } else {
                assert(!dialog.isOpen())
                assert(dialog.current() === null)
            }
        }
        assert.strictEqual(openCallbackCallCount, ids.length)
        assert.strictEqual(closeCallbackCallCount, ids.length)
    })
})
