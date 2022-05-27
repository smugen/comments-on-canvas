import { expect } from 'chai';

import MongooseDatabase from '../dist/services/MongooseDatabase';

export async function setupDb(): Promise<MongooseDatabase> {
  const { env } = process;
  expect(env).has.not.property('MONGODB_URL');
  expect(env).has.property('MONGODB_DATABASE');
  expect(env).has.property('MONGOOSE_AUTO_INDEX', 'true');

  let MONGODB_DATABASE = env.MONGODB_DATABASE;
  MONGODB_DATABASE = `test${Date.now()}-${MONGODB_DATABASE}`;

  const conn = await MongooseDatabase.conn({ ...env, MONGODB_DATABASE });
  return new MongooseDatabase(conn);
}

export async function teardownDb(db: MongooseDatabase) {
  await db.conn.dropDatabase();
  await db.conn.close();
}
