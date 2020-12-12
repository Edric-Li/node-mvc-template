import 'reflect-metadata';
import {NextFunction, Request, Response} from 'express';
import glob from 'glob';
import _ from 'lodash';
import {resolve} from 'path';

import LoggerDecorator, {Logger} from './log';

const PATH_PREFIX = Symbol('PATH_PREFIX');

interface Route {
  target: any;
  method: string;
  options?: Options;
  path: string;
  key: string;
}

export interface WebApiRequest extends Request {
  user?: any;
}

export type WebApiResponse = Response;

interface Options {
  auth: boolean;
}

const defaultOptions: Options = {
  auth: false,
};

class AuthError extends Error {}

enum ParameterType {
  params = 'params',
  body = 'body',
  user = 'user',
}

interface Parameter {
  type: ParameterType;
  name: string;
}

class RouteManager {
  @LoggerDecorator
  private readonly logger: Logger;
  private readonly app: any;
  private readonly routesPath: string;
  private readonly routes: Route[];
  private readonly iocContainer: WeakMap<any, any>;
  private readonly restfulMap: Map<string, Parameter[]>;

  constructor(app: any, routesPath: string) {
    this.app = app;
    this.routesPath = routesPath;
    this.routes = [];
    this.iocContainer = new WeakMap();
    this.restfulMap = new Map();
  }

  private static async authorizeWrap(
    options: Options,
    req: WebApiRequest,
    target: any
  ): Promise<any> {
    if (options.auth && !req.user) {
      throw new AuthError('Current user is not authenticated.');
    }
    return target();
  }

  public init(): void {
    glob
      .sync(resolve(this.routesPath, `./*.${process.env.NODE_ENV !== 'production' ? 'ts' : 'js'}`))
      .forEach(require);
    _.forEach(this.routes, this.wrap.bind(this));
  }

  public registerRoute(
    [method, path, options]: any[],
    target: any,
    key: any,
    descriptor: any
  ): any {
    this.routes.push({target, method, options, key, path});
    return descriptor;
  }

  public recurInject(target: any) {
    if (this.iocContainer.has(target)) {
      return this.iocContainer.get(target);
    }
    const instance = new target();
    this.iocContainer.set(target, instance);
    return instance;
  }

  public getRestfulMap(target: any, methodName: string | symbol): Parameter[] {
    let cache: any[] | null = [];
    const key = JSON.stringify({target, methodName}, function (key, value) {
      if (typeof value === 'object' && value !== null) {
        if (cache?.includes(value)) {
          return;
        }
        cache?.push(value);
      }
      return value;
    });
    cache = null;

    if (!this.restfulMap.has(key)) {
      this.restfulMap.set(key, []);
    }
    return this.restfulMap.get(key) || [];
  }

  public checkAndSetParameters(
    name: string,
    type: ParameterType,
    target: any,
    propertyKey: string | symbol
  ) {
    const restfulMap = this.getRestfulMap(target, propertyKey);
    restfulMap.push({type, name});
  }

  private wrap(route: Route): void {
    const {target, method, path, options, key} = route;
    const controller = this.iocContainer.get(target.constructor);
    const callback = controller[key];

    this.app[method](
      target[PATH_PREFIX] + path,
      async (req: WebApiRequest, res: WebApiResponse, next: NextFunction) => {
        const apiDescription = `${req.method} ${req.originalUrl}`;
        const start = new Date();
        const parameters = _.map(this.getRestfulMap(target, key), (parameter) =>
          parameter.type === ParameterType.user ? req.user : req[parameter.type][parameter.name]
        );

        try {
          await RouteManager.authorizeWrap(
            _.assign(defaultOptions, options),
            req,
            callback.bind(controller, ...parameters.concat([req, res, next]))
          );
          const times: number = new Date().getTime() - start.getTime();
          this.logger.info(`Access api ${apiDescription} done during ${times / 1000}s`);
        } catch (err) {
          if (err instanceof AuthError) {
            this.logger.info(`Access api ${apiDescription} failed with auth error ${err.stack}`);
            res.status(401).send(err.message);
          } else {
            this.logger.info(`Access api ${apiDescription} failed with error ${err.stack}`);
            res.status(500).send(err.message);
          }
        }
      }
    );
  }
}

export let manger: RouteManager;

export function setup(app: any) {
  manger = new RouteManager(app, resolve(__dirname, '../../controller'));
  manger.init();
}

export function Controller(prefix = ''): any {
  return (target: any, key: string, descriptor: any) => {
    manger?.recurInject(target);
    target.prototype[PATH_PREFIX] = prefix;
    return descriptor;
  };
}

export function Service(target: any) {
  manger?.recurInject(target);
}

export function GET(path: string, options?: Options): any {
  return manger?.registerRoute.bind(manger, ['get', path, options]);
}

export function POST(path: string, options?: Options): any {
  return manger?.registerRoute.bind(manger, ['post', path, options]);
}

export function Put(path: string, options?: Options): any {
  return manger?.registerRoute.bind(manger, ['put', path, options]);
}

export function Delete(path: string, options?: Options): any {
  return manger?.registerRoute.bind(manger, ['delete', path, options]);
}

export function Patch(path: string, options?: Options): any {
  return manger?.registerRoute.bind(manger, ['patch', path, options]);
}

export function Autowired(target: any, propKey: string): any {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  target[propKey] = manger?.recurInject(Reflect.getMetadata('design:type', target, propKey));
}

export function PathVariable(name: string): any {
  return manger?.checkAndSetParameters.bind(manger, name, ParameterType.params);
}

export function Body(name: string): any {
  return manger?.checkAndSetParameters.bind(manger, name, ParameterType.body);
}

export interface Roles {
  name: string;
  OrganizationId: number;
  category: string;
}

export interface User {
  id: number;
}
