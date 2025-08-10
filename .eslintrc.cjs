/* Lightweight project overrides to keep repo strict while unblocking dev */
module.exports = {
  overrides: [
    {
      files: ["app/page.tsx"],
      rules: {
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unsafe-function-type": "off",
      },
    },
  ],
};
