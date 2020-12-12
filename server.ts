import http from 'http';
import config from 'config';
import express from 'express';
import bodyParser from 'body-parser';
import compression from 'compression';
import PrettyError from 'pretty-error';
import cookieParser from 'cookie-parser';
import lo4js from './src/common/log4js';
import './src/db';
import './src/db/redis';

global.Promise = require('bluebird');

const app = express();
const logger = lo4js.getLogger('SERVER');
const server = http.createServer(app);
const port = config.has('port') ? config.get('port') : 0;

app.use(compression());
app.use(cookieParser());
app.use(bodyParser.json({limit: '10mb'}));
app.use(bodyParser.urlencoded({limit: '10mb', extended: true}));

const pe = new PrettyError();
pe.skipNodeFiles();
pe.skipPackage('express');

server.listen(port, () => {
  const address = server.address();
  const port = address && typeof address === 'object' ? address.port : '-';
  logger.info(`The server is running at http://localhost:${port}`);
});
