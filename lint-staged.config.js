export default {
  'src/**/*.{js,jsx,ts,tsx}': ['oxlint --fix', 'eslint --fix', 'prettier --write'],
  '*.{json,md,css}': ['prettier --write'],
}
