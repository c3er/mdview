const assert = require("assert")

const lib = require("./testLib")
const mocking = require("./mocking")

const STEP_TOLERANCE = 0.01

describe("Zoom library", () => {
    describe("Main part", () => {
        const ipc = require("../app/lib/ipcMain")
        const settings = require("../app/lib/settingsMain")
        const storage = require("../app/lib/main/storage")

        const zoom = require("../app/lib/zoomMain")

        let applicationSettings

        beforeEach(() => {
            mocking.register.ipc.rendererOn(ipc.messages.updateSettings)
            mocking.register.ipc.rendererOn(ipc.messages.changeZoom)

            ipc.init(mocking.mainWindow, mocking.electron)
            storage.init(mocking.dataDir, mocking.electron)
            settings.init(mocking.mainMenu, lib.DEFAULT_DOCUMENT_PATH)
            zoom.init()

            applicationSettings = storage.loadApplicationSettings()
        })

        afterEach(async () => {
            mocking.clear()
            storage.reset()
            await lib.removeDataDir()
        })

        it("zooms out", () => {
            zoom.out()

            const actualZoom = applicationSettings.zoom
            const expectedZoom = applicationSettings.ZOOM_DEFAULT - zoom.STEP
            assert(
                lib.isNear(actualZoom, expectedZoom, STEP_TOLERANCE),
                `actual: ${actualZoom}, expected: ${expectedZoom}, tolerance: ${STEP_TOLERANCE}`,
            )
        })

        it("zooms in", () => {
            zoom.in()

            const actualZoom = applicationSettings.zoom
            const expectedZoom = applicationSettings.ZOOM_DEFAULT + zoom.STEP
            assert(
                lib.isNear(actualZoom, expectedZoom, STEP_TOLERANCE),
                `actual: ${actualZoom}, expected: ${expectedZoom}, tolerance: ${STEP_TOLERANCE}`,
            )
        })

        it("sets zoom", () => {
            const expectedFactor = 1.5
            zoom.set(expectedFactor)
            assert.strictEqual(applicationSettings.zoom, expectedFactor)
        })

        it("resets zoom", () => {
            zoom.reset()
            assert.strictEqual(applicationSettings.zoom, applicationSettings.ZOOM_DEFAULT)
        })

        it("cannot zoom below the minimum factor", () => {
            const zoomOutCount = 20
            for (let i = 0; i < zoomOutCount; i++) {
                zoom.out()
            }
            assert.strictEqual(applicationSettings.zoom, zoom.MIN_FACTOR)
        })
    })

    describe("Renderer part", () => {
        const ipc = require("../app/lib/ipcRenderer")

        const zoom = require("../app/lib/zoomRenderer")

        beforeEach(() => ipc.init(mocking.electron))

        afterEach(() => mocking.clear())

        it("zooms out", () => {
            mocking.register.ipc.mainOn(ipc.messages.zoomOut)
            mocking.register.ipc.mainOn(ipc.messages.zoomIn, () => assert.fail())
            zoom.out()
        })

        it("zooms in", () => {
            mocking.register.ipc.mainOn(ipc.messages.zoomOut, () => assert.fail())
            mocking.register.ipc.mainOn(ipc.messages.zoomIn)
            zoom.in()
        })
    })
})
