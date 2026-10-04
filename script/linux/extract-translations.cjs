const fs = require('node:fs')
const path = require('node:path')
const acorn = require('acorn')
const tool = path.resolve(process.argv[2])
const output = path.resolve(process.argv[3])
const translations = new Map()
let comparisons = 0

function nodes(ast) {
  const result = []
  function walk(node) {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) return node.forEach(walk)
    if (node.type) result.push(node)
    for (const [key, value] of Object.entries(node)) if (!['start', 'end'].includes(key)) walk(value)
  }
  walk(ast)
  return result
}

function compare(a, b) {
  const first = nodes(a), second = nodes(b)
  if (first.length !== second.length || first.some((node, i) => node.type !== second[i].type)) throw new Error('AST node sequences differ')
  for (let i = 0; i < first.length; i++) {
    const original = first[i], translated = second[i]
    if (original.type === 'Literal' && typeof original.value === 'string' && typeof translated.value === 'string' && original.value !== translated.value) {
      translations.set(original.value, translated.value)
    } else if (original.type === 'TemplateElement' && original.value.cooked !== translated.value.cooked) {
      translations.set(original.value.cooked, translated.value.cooked)
    }
  }
}

for (const [platform, filename] of [['Mac', 'main.js'], ['Mac', 'renderer.js'], ['Windows', 'main.js']]) {
  const parse = file => acorn.parse(fs.readFileSync(file, 'utf8'), { ecmaVersion: 'latest' })
  try {
    compare(parse(path.join(tool, `${platform}Orig`, filename)), parse(path.join(tool, platform, filename)))
    comparisons++
  } catch {
    console.log(`Skipping changed program structure in ${platform}/${filename}; using editable translation rules instead.`)
  }
}
const verifiedEntries = translations.size
function textTokens(snippet) {
  const result = []
  const tokenizer = acorn.tokenizer(snippet, { ecmaVersion: 'latest' })
  try {
    while (true) {
      const token = tokenizer.getToken()
      if (token.type.label === 'eof') break
      if (['string', 'template'].includes(token.type.label)) result.push(token.value)
    }
  } catch {}
  return result
}
for (const filename of ['Linux.zh', 'Windows.zh']) {
  for (const line of fs.readFileSync(path.join(tool, 'Temp', filename), 'utf8').split(/\r?\n/)) {
    const [original, translated] = line.split('>*.*<')
    if (!original || !translated || !/[\u4e00-\u9fff]/.test(translated) || translations.has(original)) continue
    const first = textTokens(original), second = textTokens(translated)
    if (first.length > 0 && first.length === second.length) {
      first.forEach((text, i) => {
        if (text && /[A-Za-z]/.test(text) && /[\u4e00-\u9fff]/.test(second[i])) translations.set(text, second[i])
      })
    }
    try {
      const a = acorn.parseExpressionAt(original, 0, { ecmaVersion: 'latest' })
      const b = acorn.parseExpressionAt(translated, 0, { ecmaVersion: 'latest' })
      if (a.type === 'Literal' && b.type === 'Literal' && typeof a.value === 'string' && a.end === original.length && b.end === translated.length) {
        if (!translations.has(a.value)) translations.set(a.value, b.value)
        continue
      }
    } catch {}
    translations.set(original, translated)
  }
}
for (const [original] of translations) {
  if (!original.trim() || /^[a-z0-9_.:/-]+$/.test(original)) translations.delete(original)
}
const entries = Object.fromEntries([...translations].sort(([a], [b]) => a.localeCompare(b)))
fs.writeFileSync(output, JSON.stringify({ source: 'robotze/GithubDesktopZhTool', version: '3.6.6', verifiedAstComparisons: comparisons, verifiedEntries, entries }, null, 2) + '\n')
console.log(JSON.stringify({ comparisons, verifiedEntries, totalEntries: translations.size }))
