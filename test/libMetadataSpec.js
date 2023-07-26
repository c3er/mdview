const assert = require("chai").assert

const lib = require("./testLib")

const metadata = require("../app/lib/renderer/metadata")

describe("Markdown metadata rendering", () => {
    describe("metadata.hide", () => {
        it("doesn't change content without metadata", () => {
            const content = lib.prepareMdContent(`
                # Title

                Some content
            `)
            assert.strictEqual(metadata.hide(content), content)
        })

        it('hides metadata ending with "---"', () => {
            const content = lib.prepareMdContent(`
                ---
                topic: Content metadata
                ---

                # Title

                Some content
            `)
            const expected = lib.prepareMdContent(`
                # Title

                Some content
            `)
            assert.strictEqual(metadata.hide(content).trim(), expected)
        })

        it('hides metadata ending with "..."', () => {
            const content = lib.prepareMdContent(`
                ---
                topic: Content metadata
                ...

                # Title

                Some content
            `)
            const expected = lib.prepareMdContent(`
                # Title

                Some content
            `)
            assert.strictEqual(metadata.hide(content).trim(), expected)
        })
    })

    describe("metadata.render", () => {
        it("doesn't change content without metadata", () => {
            const content = lib.prepareMdContent(`
                # Title

                Some content
            `)
            assert.strictEqual(metadata.render(content), content)
        })

        it('renders metadata ending with "---"', () => {
            const content = lib.prepareMdContent(`
                ---
                topic: Content metadata
                ---

                # Title

                Some content
            `)
            const expected = lib.prepareMdContent(`
                **Metadata**<br>
                \`\`\`yaml
                topic: Content metadata
                \`\`\`

                # Title

                Some content
            `)
            assert.strictEqual(metadata.render(content).trim(), expected)
        })

        it('renders metadata ending with "..."', () => {
            const content = lib.prepareMdContent(`
                ---
                topic: Content metadata
                ...

                # Title

                Some content
            `)
            const expected = lib.prepareMdContent(`
                **Metadata**<br>
                \`\`\`yaml
                topic: Content metadata
                \`\`\`

                # Title

                Some content
            `)
            assert.strictEqual(metadata.render(content).trim(), expected)
        })
    })
})
