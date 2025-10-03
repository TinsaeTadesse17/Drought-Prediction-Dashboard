// Ensure Next.js picks up PostCSS config with Tailwind v4 plugin
/** @type {import('postcss-load-config').Config} */
module.exports = {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
