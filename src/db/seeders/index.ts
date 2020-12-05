import fs from 'fs';
import path from 'path';
import log4js from '../../common/log4js';

const logger = log4js.getLogger('SERVER-DB-SEEDERS');

async function init() {
  try {
    const isProduction = process.env.NODE_ENV !== 'production';
    const files = fs
      .readdirSync(__dirname)
      .filter((file) => {
        const b0 = file.indexOf('.') !== 0 && file.indexOf('_') !== 0;
        const b1 = file !== (isProduction ? 'index.ts' : 'index.js');
        const b2 = file.slice(-3) === (isProduction ? '.ts' : '.js');
        return b0 && b1 && b2;
      })
      .sort();

    const context = {};
    for (let i = 0; i < files.length; i++) {
      try {
        logger.info(`-------- ./${files[i]} ---------`);
        let func = require(path.resolve(__dirname, files[i]));
        if (typeof func === 'object' && typeof func.default === 'function') {
          func = func.default;
        }
        if (typeof func === 'function') {
          await func(context, {log: logger.info, error: logger.error, warn: logger.warn, info: logger.info});
        } else {
          logger.warn(`Seeder '${files[i]}' is not valid.`);
        }
      } catch (err) {
        const message = `Exec seeder '${files[i]}' failed with error '${err.message}'`;
        logger.error(message);
        logger.error('Error stack is:');
        logger.error(err.stack);
        break;
      }
    }
    logger.info('All seeders done.');
  } catch (err) {
    logger.info('Seeders failed.');
  } finally {
    process.exit();
  }
}

init();
