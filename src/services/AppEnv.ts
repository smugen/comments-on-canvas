import { promises as fsPromises } from 'fs';

import { Service } from 'typedi';

import logger from '../logger';

const { readFile } = fsPromises;

@Service()
export default class AppEnv {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  readonly npm_package_name = process.env.npm_package_name;
  readonly LOG_LEVEL = process.env.LOG_LEVEL ?? 'info';

  readonly MONGOOSE_DEBUG = !!JSON.parse(process.env.MONGOOSE_DEBUG || 'false');
  readonly MONGOOSE_AUTO_INDEX = !!JSON.parse(
    process.env.MONGOOSE_AUTO_INDEX || 'true',
  );

  async discoverMongo(env = process.env): Promise<string> {
    const TAG = 'AppEnv.discoverMongo';
    let { MONGODB_URL, MONGO_INITDB_ROOT_PASSWORD } = env;
    const {
      MONGODB_HOST,
      MONGODB_PORT,
      MONGODB_DATABASE,
      MONGODB_AUTH_SOURCE,

      MONGO_INITDB_ROOT_USERNAME,
      MONGO_INITDB_ROOT_PASSWORD_FILE,
    } = env;

    if (MONGODB_URL) {
      return MONGODB_URL;
    }

    logger.info(TAG, {
      MONGODB_HOST,
      MONGODB_PORT,
      MONGODB_DATABASE,
      MONGODB_AUTH_SOURCE,
      MONGO_INITDB_ROOT_USERNAME,
      MONGO_INITDB_ROOT_PASSWORD_FILE,
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'typeof MONGO_INITDB_ROOT_PASSWORD': typeof MONGO_INITDB_ROOT_PASSWORD,
    });

    let HIDE_PSWD = '';
    if (!MONGO_INITDB_ROOT_PASSWORD && MONGO_INITDB_ROOT_PASSWORD_FILE) {
      MONGO_INITDB_ROOT_PASSWORD = await readFile(
        MONGO_INITDB_ROOT_PASSWORD_FILE,
        'utf8',
      );
      HIDE_PSWD = `${typeof MONGO_INITDB_ROOT_PASSWORD}(${
        MONGO_INITDB_ROOT_PASSWORD.length
      })`;
      logger.info(TAG, { MONGO_INITDB_ROOT_PASSWORD: HIDE_PSWD });
    }

    MONGODB_URL = `
mongodb://${MONGO_INITDB_ROOT_USERNAME}:${MONGO_INITDB_ROOT_PASSWORD}@${MONGODB_HOST}:${MONGODB_PORT}/${MONGODB_DATABASE}
      `.trim();

    if (MONGODB_AUTH_SOURCE) {
      MONGODB_URL += '?authSource=' + MONGODB_AUTH_SOURCE;
    }

    const MONGODB_URL_HIDE_PSWD = MONGO_INITDB_ROOT_PASSWORD
      ? MONGODB_URL.replace(MONGO_INITDB_ROOT_PASSWORD, HIDE_PSWD)
      : MONGODB_URL;
    logger.info(TAG, { MONGODB_URL: MONGODB_URL_HIDE_PSWD });
    return MONGODB_URL;
  }
}
