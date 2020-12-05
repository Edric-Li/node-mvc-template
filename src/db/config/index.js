const config = require('config');

const setting = config.get('db')
module.exports = {
  development: setting,
  production: setting,
};
