#!/usr/bin/env node

"use strict"

const appRoot = require("app-root-path")
const path = require("path")
const packageInfo = require(path.join(appRoot.path, "package.json"))
const { Command } = require("commander")

const program = new Command()
program.version(packageInfo.version).command("run [name]", "run specified task").parse(process.argv)

const subCmd = program.args[0]
if (!subCmd || subCmd !== "run") {
   program.help()
}
