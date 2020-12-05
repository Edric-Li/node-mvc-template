import config from 'config';
import {Sequelize} from 'sequelize';

import lo4js from '../common/log4js';

if (config.has('cls-hooked.namespace')) {
  Sequelize.useCLS(require('cls-hooked').createNamespace(config.get('cls-hooked.namespace')));
}

let sequelize: null | Sequelize;

function connect() {
  const logger = lo4js.getLogger('SERVER-DB');
  sequelize = new Sequelize(config.get('db'));
  sequelize
    .authenticate()
    .then(() => {
      logger.info('Connection has been established successfully.');
    })
    .catch((err: any) => {
      logger.error('Unable to connect to the database:', err.stack);
    });
}

connect();

