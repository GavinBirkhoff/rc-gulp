const sass = require("sass")
const { readFileSync } = require("fs")
const path = require("path")

function transformSass(sassFile, config = {}) {
   const { cwd = process.cwd() } = config
   const resolvedSassFile = path.resolve(cwd, sassFile)

   let data = readFileSync(resolvedSassFile, "utf-8")
   data = data.replace(/^\uFEFF/, "")

   // Do sass compile

   return sass.renderSync({ data })
}

module.exports = transformSass
