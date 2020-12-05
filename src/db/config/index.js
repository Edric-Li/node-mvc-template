const config = require('config');

const setting = Object.assign(config.sequelize.options, {
  pool: {
    min: 0,
    max: 8,
    acquire: 60000,
    idle: 300,
  },
  logging: false,
})

module.exports = {
  development: setting,
  production: setting,
};
