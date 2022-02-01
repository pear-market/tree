const sha256 = require('js-sha256')

module.exports = {
  DOMAIN: `0x${sha256('test domain')}`,
}
