import { getModelForClass } from '@typegoose/typegoose';
import mongoose, { Connection } from 'mongoose';
import Container, { Service } from 'typedi';

import logger from '../logger';
import { Image, ImageModel, User, UserModel } from '../models';
import AppEnv from './AppEnv';

interface Models {
  User: UserModel;
  Image: ImageModel;
}

@Service()
export default class MongooseDatabase {
  static conn(): Connection;
  static conn(env: NodeJS.ProcessEnv): Promise<Connection>;
  static conn(env?: NodeJS.ProcessEnv): Connection | Promise<Connection> {
    const TAG = 'MongooseDatabase.conn';
    const appEnv = Container.get(AppEnv);

    const MONGOOSE_DEBUG =
      env?.MONGOOSE_DEBUG !== void 0
        ? !!JSON.parse(env.MONGOOSE_DEBUG)
        : appEnv.MONGOOSE_DEBUG;

    const MONGOOSE_AUTO_INDEX =
      env?.MONGOOSE_AUTO_INDEX !== void 0
        ? !!JSON.parse(env.MONGOOSE_AUTO_INDEX)
        : appEnv.MONGOOSE_AUTO_INDEX;

    mongoose.set('debug', MONGOOSE_DEBUG);

    const config = {
      autoIndex: MONGOOSE_AUTO_INDEX,
    };

    const promiseConn = appEnv
      .discoverMongo(env)
      .then(url =>
        env
          ? mongoose.createConnection(url, config)
          : mongoose.connect(url, config).then(({ connection }) => connection),
      )
      .then(conn =>
        conn
          .on('reconnectFailed', (...args) =>
            logger.error(`${TAG} reconnectFailed`, { args }),
          )
          .on('open', () => logger.info(`${TAG} open`)),
      )
      .catch(err => {
        logger.error(TAG, { err });
        throw err;
      });

    return env ? promiseConn : mongoose.connection;
  }

  readonly conn: Connection;
  readonly models: Models;

  readonly UserModel: UserModel;
  readonly ImageModel: ImageModel;

  constructor(conn?: Connection) {
    this.conn = conn ?? MongooseDatabase.conn();
    const models = (this.models = this._models());

    this.UserModel = models.User;
    this.ImageModel = models.Image;
  }

  private _models(): Models {
    const options = { existingConnection: this.conn };

    return {
      User: getModelForClass(User, options),
      Image: getModelForClass(Image, options),
    };
  }
}
