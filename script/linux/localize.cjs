const fs = require('node:fs')
const path = require('node:path')
const acorn = require('acorn')
const [bundleDirectory, dictionaryPath, reportPath] = process.argv.slice(2)
const dictionary = JSON.parse(fs.readFileSync(dictionaryPath, 'utf8'))
const report = { source: dictionary.source, version: dictionary.version, files: {} }

function walk(node, visit, parent, key) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) return node.forEach(n => walk(n, visit, parent, key))
  if (node.type) visit(node, parent, key)
  for (const [childKey, value] of Object.entries(node)) {
    if (!['start', 'end'].includes(childKey)) walk(value, visit, node, childKey)
  }
}

for (const filename of ['main.js', 'renderer.js', 'crash.js']) {
  const file = path.join(bundleDirectory, filename)
  const original = fs.readFileSync(file, 'utf8')
  const ast = acorn.parse(original, { ecmaVersion: 'latest' })
  const edits = []
  const matched = new Set()
  walk(ast, (node, parent, key) => {
    if (node.type === 'Literal' && typeof node.value === 'string') {
      if (parent?.type === 'Property' && key === 'key') return
      if (['BinaryExpression', 'SwitchCase', 'ImportDeclaration', 'ExportNamedDeclaration'].includes(parent?.type)) return
      if (parent?.type === 'MemberExpression' && key === 'property') return
      const translated = dictionary.entries[node.value]
      if (typeof translated === 'string' && translated !== node.value) {
        edits.push({ start: node.start, end: node.end, text: JSON.stringify(translated) })
        matched.add(node.value)
      }
    } else if (node.type === 'TemplateElement') {
      const translated = dictionary.entries[node.value.cooked]
      if (typeof translated === 'string' && translated !== node.value.cooked) {
        const text = translated.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')
        edits.push({ start: node.start, end: node.end, text })
        matched.add(node.value.cooked)
      }
    }
  })
  let localized = original
  for (const edit of edits.sort((a, b) => b.start - a.start)) localized = localized.slice(0, edit.start) + edit.text + localized.slice(edit.end)
  const translatedAst = acorn.parse(localized, { ecmaVersion: 'latest' })
  const skeleton = value => JSON.stringify(value, function(key, v) {
    if (['start', 'end', 'raw'].includes(key)) return undefined
    if (this.type === 'Literal' && key === 'value' && typeof v === 'string') return '<string>'
    if (this.type === 'TemplateElement' && key === 'value') return '<template-text>'
    return v
  })
  if (skeleton(ast) !== skeleton(translatedAst)) throw new Error(`Localization changed program structure: ${filename}`)
  fs.writeFileSync(file + '.english', original)
  fs.writeFileSync(file, localized.replace(/\n\/\/# sourceMappingURL=.*$/, ''))
  report.files[filename] = { replacements: edits.length, uniqueStrings: matched.size, syntaxAndStructureVerified: true }
}
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
