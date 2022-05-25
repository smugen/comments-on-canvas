import assert from 'assert';
import { readFile } from 'fs/promises';
import { Server } from 'http';
import { AddressInfo } from 'net';
import { resolve } from 'path';
import { URL } from 'url';

import { expect } from 'chai';
import { after, before, describe, it } from 'mocha';
import fetch from 'node-fetch';
import Container from 'typedi';

import HttpApp from '../dist/services/HttpApp';
import MongooseDatabase from '../dist/services/MongooseDatabase';
import { setupDb, teardownDb } from './db';

describe('apis', () => {
  let db: MongooseDatabase;
  let server: Server;
  let address: AddressInfo;

  before(async () => {
    expect(db).equals(void 0);
    Container.set(MongooseDatabase, (db = await setupDb()));

    const httpApp = Container.get(HttpApp).getKoa();
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
    it('GET should return api info', async () => {
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

  const info = {
    name: 'test',
    username: 'test@email.com',
  };
  const password = 'test-pass';

  describe('/api/User', () => {
    let endpoint: string;

    before(() => {
      endpoint = `${prefix(address.port)}/User`;
    });

    it('POST should validate missing input and return 400', async () => {
      const url = new URL(endpoint);
      const res = await fetch(url.href, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      expect(res.ok).is.false;
      expect(res.status).equals(400);
    });

    it('POST should validate non-email username and return 400', async () => {
      const url = new URL(endpoint);
      const res = await fetch(url.href, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...info, password, username: 'no-mail' }),
      });
      expect(res.ok).is.false;
      expect(res.status).equals(400);
    });

    it('POST should create a new user', async () => {
      const url = new URL(endpoint);
      const res = await fetch(url.href, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...info, password }),
      });
      expect(res.ok).is.true;
      expect(res.status).equals(201);

      const body = await res.json();
      expect(body).has.property('user');
      expect(body).has.property('password', password);
      expect(body.user).has.property('name', info.name);
      expect(body.user).has.property('username', info.username);
    });

    it('POST should return 409 with same username', async () => {
      const url = new URL(endpoint);
      const res = await fetch(url.href, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...info, password }),
      });
      expect(res.ok).is.false;
      expect(res.status).equals(409);
    });
  });

  let token: string;

  describe('/api/Me', () => {
    let endpoint: string;

    before(() => {
      endpoint = `${prefix(address.port)}/Me`;
    });

    it('GET should return 401 with no token', async () => {
      const url = new URL(endpoint);
      const res = await fetch(url.href);
      expect(res.ok).is.false;
      expect(res.status).equals(401);
    });

    it('GET should return 401 with invalid token', async () => {
      const url = new URL(endpoint);
      const res = await fetch(url.href, { headers: bearer('invalid-token') });
      expect(res.ok).is.false;
      expect(res.status).equals(401);
    });

    it('PUT should return 401 with bad credential', async () => {
      const { username } = info;
      const url = new URL(endpoint);
      let res = await fetch(url.href, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: 'bad-pass' }),
      });
      expect(res.ok).is.false;
      expect(res.status).equals(401);

      res = await fetch(url.href, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: 'bad-username', password }),
      });
      expect(res.ok).is.false;
      expect(res.status).equals(401);
    });

    it('PUT should return 200 contains token', async () => {
      const { username } = info;
      const url = new URL(endpoint);
      const res = await fetch(url.href, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      expect(res.ok).is.true;
      expect(res.status).equals(200);

      const body = await res.json();
      expect(body).has.property('cyToken');
      token = body.cyToken;
    });

    it('GET should return 200 with valid token', async () => {
      const url = new URL(endpoint);
      const res = await fetch(url.href, { headers: bearer(token) });
      expect(res.ok).is.true;
      expect(res.status).equals(200);
    });

    it('DEL should return 205 with cookie deletion', async () => {
      const url = new URL(endpoint);
      const res = await fetch(url.href, { method: 'DELETE' });
      expect(res.ok).is.true;
      expect(res.status).equals(205);

      const setCookie = res.headers.raw()['set-cookie'];
      expect(setCookie).to.match(/^CYToken=;/);
    });
  });

  let imageId: string;

  describe('/api/Image', () => {
    let endpoint: string;
    const extension = 'png';
    const position = { x: 100, y: 50 };

    before(() => {
      endpoint = `${prefix(address.port)}/Image`;
    });

    it('POST should create new image', async () => {
      const url = new URL(endpoint);
      const res = await fetch(url.href, {
        method: 'POST',
        headers: { ...bearer(token), 'Content-Type': 'application/json' },
        body: JSON.stringify({ extension, ...position }),
      });
      expect(res.ok).is.true;
      expect(res.status).equals(201);

      const body = await res.json();
      expect(body).has.property('image');

      const { image } = body;
      expect(image).has.property('extension', extension);
      expect(image).has.property('x', position.x);
      expect(image).has.property('y', position.y);
      expect(image).has.property('id').is.a('string');
      imageId = image.id;
    });

    it('GET should return one image in list', async () => {
      const url = new URL(endpoint);
      const res = await fetch(url.href, { headers: bearer(token) });
      expect(res.ok).is.true;
      expect(res.status).equals(200);

      const body = await res.json();
      expect(body).has.property('images');
      expect(body.images).to.have.lengthOf(1);
    });
  });

  describe('/api/Image/:id', () => {
    let endpoint: (id: string) => string;

    before(() => {
      endpoint = id => `${prefix(address.port)}/Image/${id}`;
    });

    it('GET should return 200 with image', async () => {
      const url = new URL(endpoint(imageId));
      const res = await fetch(url.href, { headers: bearer(token) });
      expect(res.ok).is.true;
      expect(res.status).equals(200);

      const body = await res.json();
      expect(body).has.property('image');
    });

    it('GET should return 404 with invalid id', async () => {
      const url = new URL(endpoint('invalid-id'));
      const res = await fetch(url.href, { headers: bearer(token) });
      expect(res.ok).is.false;
      expect(res.status).equals(404);
    });
  });

  describe('/api/Image/:id/blob', () => {
    let endpoint: (id: string) => string;
    let file: Buffer;
    let redirectPath: string;

    before(async () => {
      endpoint = id => `${prefix(address.port)}/Image/${id}/blob`;
      file = await readFile(resolve(__dirname, './ts-logo-128.png'));
    });

    it('PUT should redirect to blob', async () => {
      const url = new URL(endpoint(imageId));
      const res = await fetch(url.href, {
        method: 'PUT',
        headers: { ...bearer(token), 'Content-length': `${file.length}` },
        body: file,
        redirect: 'manual',
      });
      expect(res.status).equals(302);

      const location = res.headers.get('Location');
      assert(typeof location === 'string');
      redirectPath = location;
    });

    it('blob should has same content', async () => {
      const url = new URL(redirectPath);
      const res = await fetch(url);
      expect(res.ok).is.true;
      expect(res.status).equals(200);

      const body = await res.buffer();
      expect(body.equals(file)).is.true;
    });
  });
});

function prefix(port: number) {
  return `http://127.0.0.1:${port}/api`;
}

function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}
