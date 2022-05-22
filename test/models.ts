import { expect } from 'chai';
import { after, before, describe, it } from 'mocha';

import { UserDocument, UserModel } from '../dist/models';
import MongooseDatabase from '../dist/services/MongooseDatabase';

describe('models', () => {
  let db: MongooseDatabase;

  before(async () => {
    const { env } = process;
    expect(env).has.not.property('MONGODB_URL');
    expect(env).has.property('MONGODB_DATABASE');
    expect(env).has.property('MONGOOSE_AUTO_INDEX').equals('true');
    expect(db).equals(void 0);

    let MONGODB_DATABASE = env.MONGODB_DATABASE;
    MONGODB_DATABASE = `test${Date.now()}-${MONGODB_DATABASE}`;

    const conn = await MongooseDatabase.conn({ ...env, MONGODB_DATABASE });
    db = new MongooseDatabase(conn);
  });

  after(async () => {
    await db.conn.dropDatabase();
    await db.conn.close();
  });

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
          expect(keyValue).has.property('username').equals(info.username);
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
});

function reverse(str: string): string {
  return str.split('').reverse().join('');
}
