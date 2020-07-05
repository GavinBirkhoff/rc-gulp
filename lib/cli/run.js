#!/usr/bin/env node

const path = require("path")
const runCmd = require("../runCmd")
const { Command } = require("commander")
const program = new Command()

program.parse(process.argv)

function runTask() {
   runCmd("npx", ["gulp", `--gulpfile   ${path.resolve(__dirname, "..", "gulpfile.js")}`, ...arguments])
}

console.log("rc-gulp run", program.args.toString())
runTask(...program.args)
