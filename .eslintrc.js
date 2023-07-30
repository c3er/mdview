module.exports = {
    env: {
        browser: true,
        commonjs: true,
        es2021: true,
        node: true,
        mocha: true,
    },
    extends: ["eslint:recommended", "prettier"],
    overrides: [
        {
            env: {
                node: true,
            },
            files: [".eslintrc.{js,cjs}"],
            parserOptions: {
                sourceType: "script",
            },
        },
    ],
    parserOptions: {
        ecmaVersion: "latest",
    },
    rules: {
        "consistent-return": "error",
        "consistent-this": "error",
        "no-constructor-return": "error",
        "no-implicit-coercion": "error",
        "no-implicit-globals": "error",
        "no-lonely-if": "error",
        "no-throw-literal": "error",
        "no-unmodified-loop-condition": "error",
        "no-unneeded-ternary": "error",
        "no-unreachable-loop": "error",
        "no-unused-expressions": "error",
        "no-unused-private-class-members": "error",
        "no-useless-constructor": "error",
        "no-var": "error",
        "one-var": ["error", "never"],
        "prefer-const": "error",
        "prefer-object-spread": "error",
        "prefer-spread": "error",
        "prefer-template": "error",
        "require-await": "error",
        "spaced-comment": "warn",
        camelcase: "error",
        curly: "error",
        eqeqeq: "error",
        "capitalized-comments": [
            "warn",
            "always",
            {
                ignoreConsecutiveComments: true,
                ignorePattern: "\\S*\\(.*\\)|ms|em",
            },
        ],
        "lines-around-comment": [
            "warn",
            {
                allowBlockStart: true,
                beforeLineComment: true,
            },
        ],
        "no-magic-numbers": [
            "error",
            {
                ignore: [-1, 0, 1, 2],
                ignoreClassFieldInitialValues: true,
            },
        ],
    },
}
