module.exports = {
    env: {
        es2021: true,
        node: true,
    },
    extends: ["standard", "prettier"],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: 12,
        sourceType: "module",
    },
    plugins: ["@typescript-eslint", "prettier"],
    rules: {
        camelcase: 0,
        "no-unused-vars":1,
        "no-undef": 0,
        "sort-keys": [
            "error",
            "asc",
            { caseSensitive: true, natural: false, minKeys: 2 },
        ],
    },
};
