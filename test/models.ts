import assert from 'assert';

import { expect } from 'chai';
import { after, before, describe, it } from 'mocha';
import { ObjectId } from 'mongodb';

import { ImageModel, UserDocument, UserModel } from '../dist/models';
import MongooseDatabase from '../dist/services/MongooseDatabase';
import { setupDb, teardownDb } from './db';

describe('models', () => {
  let db: MongooseDatabase;

  before(async () => {
    expect(db).equals(void 0);
    db = await setupDb();
  });

  after(() => teardownDb(db));

  describe('User', () => {
    let User: UserModel;
    const info = {
      name: 'test',
      username: 'test@email.com',
    };
    const pswd = 'test-pass';
    let userId: string;

    before(() => {
      User = db.models.User;
      expect(User).is.not.equals(void 0);
    });

    describe('New user', () => {
      let user: UserDocument;

      it('should create a new user', async () => {
        user = await new User(info).setPassword(pswd);
        expect(user.isNew).is.true;

        await user.save();
        expect(user.isNew).is.false;

        expect(user.name).equals(info.name);
        expect(user.username).equals(info.username);

        userId = user.id;
      });

      it('should verify the correct password', async () => {
        const [ok, notOk] = await Promise.all([
          user.verifyPassword(pswd),
          user.verifyPassword(reverse(pswd)),
        ]);

        expect(ok).is.true;
        expect(notOk).is.false;
      });

      it('should mask password salt and derivedKey', async () => {
        const {
          password: { salt, derivedKey },
        } = user.toObject();
        expect(salt).to.match(/^Buffer\(\d+\)$/);
        expect(derivedKey).to.match(/^Buffer\(\d+\)$/);
      });

      it('should reject same username to be created', async () => {
        try {
          await (await new User(info).setPassword(pswd)).save();
        } catch (err) {
          const { name, code, keyValue } = err as Error & {
            code: number;
            keyValue: Record<string, unknown>;
          };

          expect(name).equals('MongoServerError');
          expect(code).equals(11000);
          expect(keyValue).has.property('username', info.username);
        }
      });
    });

    describe('Existing user', () => {
      it('should find no user with wrong username', async () => {
        const user = await User.verify(reverse(info.username), pswd);
        expect(user).is.null;
      });

      it('should find no user with wrong password', async () => {
        const user = await User.verify(info.username, reverse(pswd));
        expect(user).is.null;
      });

      it('should find the user with correct username and password', async () => {
        const user = await User.verify(info.username, pswd);
        expect(user).is.not.null;
        expect(user?.id).equals(userId);
      });
    });
  });

  describe('Image', () => {
    let Image: ImageModel;
    let userId: ObjectId;

    before(async () => {
      Image = db.models.Image;

      const user = await db.models.User.findOne();
      assert(user);
      userId = user._id;
    });

    it('should create a new image', async () => {
      const image = await Image.create({ userId, extension: 'png' });
      expect(image.userId.equals(userId)).is.true;
      expect(image.extension).equals('png');
      expect(image.x).equals(0);
      expect(image.y).equals(0);
    });

    it('should reject nonexistent userId', async () => {
      try {
        await Image.create({
          userId: new ObjectId(),
          extension: 'png',
        });
      } catch (err) {
        const { name } = err as Error;
        expect(name).equals('ValidationError');
      }
    });

    it('should reject invalid extension', async () => {
      try {
        await Image.create({
          userId,
          extension: 'txt',
        });
      } catch (err) {
        const { name } = err as Error;
        expect(name).equals('ValidationError');
      }
    });
  });
});

function reverse(str: string): string {
  return str.split('').reverse().join('');
}
