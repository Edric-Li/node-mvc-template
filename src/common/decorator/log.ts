import log4js from '../log4js';

export default function LoggerDecorator(arg0: any, arg1?: string): any {
  if (typeof arg0 === 'object' && arg1) {
    arg0[arg1] = log4js.getLogger(arg0.constructor.name);
  }
  return (target: any, propKey: string) => {
    target[propKey] = log4js.getLogger(arg0);
  };
}

export * from 'log4js';
