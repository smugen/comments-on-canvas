import { inspect } from 'util';

import chalk from 'chalk';
import stc from 'string-to-color';
import Container from 'typedi';
import winston from 'winston';

import AppEnv from './services/AppEnv';

const env = Container.get(AppEnv);

const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: winston.format.json(),
  defaultMeta: { service: env.npm_package_name },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.metadata({
          fillExcept: ['level', 'message', 'service', 'module'],
        }),
        winston.format.colorize(),
        winston.format.printf(info => {
          let message = `${info.level}: ${info.message}`;
          if (Object.keys(info.metadata).length) {
            message = `${message} ${inspect(info.metadata, {
              depth: 5,
              colors: true,
              compact: 3,
            })}`;
          }

          if (info.module) {
            message = `${message} ${chalk.hex(stc(info.module))(
              `[${info.module}]`,
            )}`;
          }

          return message;
        }),
      ),
    }),
  ],
});

export default logger;
