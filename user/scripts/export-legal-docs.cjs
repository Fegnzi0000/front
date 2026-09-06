// Mechanical export from the same content rendered by the mini-program.
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const source = fs.readFileSync(path.resolve(__dirname, '../src/domain/legal.ts'), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const legal = {}
new Function('exports', compiled)(legal)
const destination = path.resolve(__dirname, '../docs/legal')
fs.mkdirSync(destination, { recursive: true })
for (const document of Object.values(legal.legalDocuments)) {
  const content = `# ${document.title}\n\n${document.text.split('\n').join('\n\n')}\n`
  fs.writeFileSync(path.join(destination, `${document.title}.md`), content, 'utf8')
}
console.log('Exported three legal documents from the mini-program content source.')
