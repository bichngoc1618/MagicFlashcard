const fs = require('fs');
const path = require('path');

const metroConfigPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'metro-config',
  'src',
  'loadConfig.js',
);

if (!fs.existsSync(metroConfigPath)) {
  process.exit(0);
}

let content = fs.readFileSync(metroConfigPath, 'utf8');

if (!content.includes("var _url = require(\"url\");")) {
  content = content.replace('var _yaml = require("yaml");', 'var _yaml = require("yaml");\nvar _url = require("url");');
}

const importLine = 'const configModule = await import(absolutePath);';
const importLinePatched =
  "const configModule = await import(\n" +
  "          path.isAbsolute(absolutePath)\n" +
  "            ? (0, _url.pathToFileURL)(absolutePath).href\n" +
  "            : absolutePath,\n" +
  "        );";

if (content.includes(importLine)) {
  content = content.replace(importLine, importLinePatched);
  fs.writeFileSync(metroConfigPath, content, 'utf8');
  console.log('Patched metro-config for Windows ESM path handling.');
}
