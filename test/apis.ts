import { Server } from 'http';
import { AddressInfo } from 'net';
import { URL } from 'url';

import { expect } from 'chai';
import { after, before, describe, it } from 'mocha';
import fetch from 'node-fetch';

import HttpApp from '../dist/services/HttpApp';
import MongooseDatabase from '../dist/services/MongooseDatabase';
import { setupDb, teardownDb } from './db';

describe('apis', () => {
  let db: MongooseDatabase;
  let server: Server;
  let address: AddressInfo;

  before(async () => {
    expect(db).equals(void 0);
    db = await setupDb();

    const httpApp = new HttpApp(db).getKoa();
    await new Promise<void>((res, rej) => {
      server = httpApp.listen().on('listening', res).on('error', rej);
    });
    const addr = server.address();
    if (!addr || typeof addr !== 'object') {
      throw new Error(`Invalid server address ${addr}`);
    }
    address = addr;
  });

  after(async () => {
    await new Promise<void>((res, rej) =>
      server.close(err => (err ? rej(err) : res())),
    );
    await teardownDb(db);
  });

  describe('/api', () => {
    it('should return api info', async () => {
      const url = new URL(prefix(address.port));
      const res = await fetch(url.href);
      expect(res.ok).is.true;

      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { name, description, version } = require('../package.json');
      const body = await res.json();

      expect(body).has.property('name', name);
      expect(body).has.property('description', description);
      expect(body).has.property('version', version);
      expect(body).has.property('mongoVersion').is.a('string');
    });
  });
});

function prefix(port: number) {
  return `http://127.0.0.1:${port}/api`;
}
