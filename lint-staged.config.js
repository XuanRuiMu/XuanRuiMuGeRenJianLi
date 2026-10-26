export default {
  'src/**/*.{js,jsx,ts,tsx}': () => 'npm run lint',
  '**/*.{json,md,css}': () => 'npx prettier --check .',
}
