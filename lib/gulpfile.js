const gulp = require("gulp")
const rimraf = require("rimraf")
const through2 = require("through2")
const webpack = require("webpack")
const merge2 = require("merge2")
const ts = require("gulp-typescript")
const babel = require("gulp-babel")
const stripCode = require("gulp-strip-code")
const argv = require("minimist")(process.argv.slice(2))
const path = require("path")

const { getProjectPath, injectRequire, getConfig } = require("./utils/projectHelper")
const transformLess = require("./transformLess")
const transformSass = require("./transformSass")
const getBabelCommonConfig = require("./getBabelCommonConfig")
const replaceLib = require("./replaceLib")
const { cssInjection } = require("./utils/styleUtil")

const tsConfig = require("./getTSCommonConfig")()
const tsDefaultReporter = ts.reporter.defaultReporter()

const cwd = process.cwd()
const libDir = getProjectPath("lib")
const esDir = getProjectPath("es")
const distDir = getProjectPath("dist")

function babelify(js, modules) {
   const babelConfig = getBabelCommonConfig(modules)
   delete babelConfig.cacheDirectory
   if (modules === false) {
      babelConfig.plugins.push(replaceLib)
   }
   let stream = js.pipe(babel(babelConfig)).pipe(
      through2.obj(function z(file, encoding, next) {
         this.push(file.clone())
         if (file.path.match(/(\/|\\)style(\/|\\)index\.js/)) {
            const content = file.contents.toString(encoding)
            if (content.indexOf("'react-native'") !== -1) {
               next()
               return
            }

            file.contents = Buffer.from(cssInjection(content))
            file.path = file.path.replace(/index\.js/, "css.js")
            this.push(file)
            next()
         } else {
            next()
         }
      }),
   )
   if (modules === false) {
      stream = stream.pipe(
         stripCode({
            start_comment: "@remove-on-es-build-begin",
            end_comment: "@remove-on-es-build-end",
         }),
      )
   }
   return stream.pipe(gulp.dest(modules === false ? esDir : libDir))
}

async function compile(modules) {
   rimraf.sync(modules !== false ? libDir : esDir)

   const lessPath = path.join(getProjectPath(), "components/**/*.less")
   const sassPath = path.join(getProjectPath(), "components/**/*.scss")
   const assetsPath = path.join(getProjectPath(), "components/**/*.@(png|svg)")
   const sourcePath = [
      "components/**/*.tsx",
      "components/**/*.ts",
      "typings/**/*.d.ts",
      "!components/**/__tests__/**",
   ].map(item => path.join(getProjectPath(), item))

   const less = gulp
      .src(lessPath)
      .pipe(
         through2.obj(function (file, encoding, next) {
            this.push(file.clone())
            if (
               file.path.match(/(\/|\\)style(\/|\\)index\.less$/) ||
               file.path.match(/(\/|\\)style(\/|\\)v2-compatible-reset\.less$/)
            ) {
               transformLess(file.path)
                  .then(css => {
                     file.contents = Buffer.from(css)
                     file.path = file.path.replace(/\.less$/, ".css")
                     this.push(file)
                     next()
                  })
                  .catch(e => {
                     console.error(e)
                  })
            } else {
               next()
            }
         }),
      )
      .pipe(gulp.dest(modules === false ? esDir : libDir))

   const sass = gulp
      .src(sassPath)
      .pipe(
         through2.obj(function (file, encoding, next) {
            this.push(file.clone())
            if (
               file.path.match(/(\/|\\)style(\/|\\)index\.scss$/) ||
               file.path.match(/(\/|\\)style(\/|\\)v2-compatible-reset\.scss$/)
            ) {
               file.contents = transformSass(file.path)
               file.path = file.path.replace(/\.scss$/, ".css")
               this.push(file)
               next()
            } else {
               next()
            }
         }),
      )
      .pipe(gulp.dest(modules === false ? esDir : libDir))

   const assets = gulp.src(assetsPath).pipe(gulp.dest(modules === false ? esDir : libDir))
   let error = 0

   // allow jsx file in components/xxx/
   if (tsConfig.allowJs) {
      sourcePath.unshift("components/**/*.jsx")
   }
   const tsResult = gulp.src(sourcePath).pipe(
      ts(tsConfig, {
         error(e) {
            tsDefaultReporter.error(e)
            error = 1
         },
         finish: tsDefaultReporter.finish,
      }),
   )

   function check() {
      if (error && !argv["ignore-error"]) {
         process.exit(1)
      }
   }

   tsResult.on("finish", check)
   tsResult.on("end", check)
   const tsFilesStream = babelify(tsResult.js, modules)
   const tsd = tsResult.dts.pipe(gulp.dest(modules === false ? esDir : libDir))
   return merge2([less, tsFilesStream, tsd, assets])
}

function defaultTask(cb) {
   // place code for your default task here
   console.log(123456)
   console.log("  Usage:")
   console.log()
   console.log("    $", "rc-gulp run dist", "out to dist")
   console.log("    $", "rc-gulp run compile", "compile project")
   console.log()
   cb()
}

async function distTask() {
   rimraf.sync(getProjectPath("dist"))
   process.env.RUN_ENV = "PRODUCTION"
   const webpackConfig = require(getProjectPath("webpack.config.js"))
   webpack(webpackConfig, (err, stats) => {
      if (err) {
         console.error(err.stack || err)
         if (err.details) {
            console.error(err.details)
         }
         return
      }

      const info = stats.toJson()

      if (stats.hasErrors()) {
         console.error(info.errors)
      }

      if (stats.hasWarnings()) {
         console.warn(info.warnings)
      }

      const buildInfo = stats.toString({
         colors: true,
         children: true,
         chunks: false,
         modules: false,
         chunkModules: false,
         hash: false,
         version: false,
      })
      console.log(buildInfo)

      // Additional process of dist finalize
      const { dist: { finalize } = {} } = getConfig()
      if (finalize) {
         console.log("[Dist] Finalization...")
         finalize()
      }
   })
}

async function compileWithESTask() {
   console.log("[Parallel] Compile to es...")
   return compile(false)
}

async function compileWithLibTask() {
   console.log("[Parallel] Compile to js...")
   return compile()
}

async function compileFinalizeTask() {
   const { compile: { finalize } = {} } = getConfig()
   if (finalize) {
      console.log("[Compile] Finalization...")
      finalize()
   }
}

exports.default = defaultTask
exports.dist = distTask
exports.compile = gulp.series(gulp.parallel(compileWithESTask, compileWithLibTask), compileFinalizeTask)
