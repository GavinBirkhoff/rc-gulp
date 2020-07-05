module.exports = {
   env: {
      commonjs: true,
      es2020: true,
      node: true,
   },
   extends: ["eslint:recommended"],
   parserOptions: {
      ecmaVersion: 11,
   },
   plugins: ["prettier"],
   rules: {
      "no-unused-vars": "warn",
      "prettier/prettier": "error",
   },
}
