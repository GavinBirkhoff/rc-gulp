# rc-gulp 🔧🔧🔧

```bash
rc-gulp run dist
rc-gulp run compile
rc-gulp run pub
```
# Configuration
  Add .rc-gulp.config.js in your app root
  ```javascript
  module.exports = {
    compile: {
      finalize: ()=>{console.log(`Final task`)},
    },
  }
  ```
  Add webpack.config.js in your app root
  ```javascript
  const getWebpackConfig = require('rc-gulp/lib/getWebpackConfig');
  const webpackConfig = getWebpackConfig(false);
  module.exports = webpackConfig;
  ```