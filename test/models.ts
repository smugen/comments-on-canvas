import assert from 'assert';

import { expect } from 'chai';
import { after, before, describe, it } from 'mocha';
import { ObjectId } from 'mongodb';

import {
  CommentDocument,
  CommentModel,
  ImageModel,
  MarkerDocument,
  MarkerModel,
  UserDocument,
  UserModel,
} from '../dist/models';
import MongooseDatabase from '../dist/services/MongooseDatabase';
import { setupDb, teardownDb } from './common';

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
        assert.fail('should not reach here');
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
        assert.fail('should not reach here');
      } catch (err) {
        const { name } = err as Error;
        expect(name).equals('ValidationError');
      }
    });
  });

  let markerThread1: MarkerDocument;
  let markerThread2: MarkerDocument;

  describe('Marker', () => {
    let Marker: MarkerModel;
    let imageId: ObjectId;

    before(async () => {
      Marker = db.models.Marker;

      const image = await db.models.Image.findOne();
      assert(image);
      imageId = image._id;
    });

    it('should create a new marker on canvas', async () => {
      const marker = await Marker.create({});
      expect(marker.imageId).is.undefined;
      expect(marker.x).equals(0);
      expect(marker.y).equals(0);

      markerThread1 = marker;
    });

    it('should create a new marker on image', async () => {
      const marker = await Marker.create({ imageId });
      assert(marker.imageId);
      expect(marker.imageId.equals(imageId)).is.true;
      expect(marker.x).equals(0);
      expect(marker.y).equals(0);

      markerThread2 = marker;
    });

    it('should reject nonexistent imageId', async () => {
      try {
        await Marker.create({ imageId: new ObjectId() });
        assert.fail('should not reach here');
      } catch (err) {
        const { name } = err as Error;
        expect(name).equals('ValidationError');
      }
    });
  });

  let commentOnThread2: CommentDocument;

  describe('Comment', () => {
    let Comment: CommentModel;
    let userId: ObjectId;

    before(async () => {
      Comment = db.models.Comment;

      const user = await db.models.User.findOne();
      assert(user);
      userId = user._id;
    });

    it('should create 2 comments on thread1', async () => {
      const markerId = markerThread1._id;
      const comments = await Comment.create([
        { userId, markerId, text: 'test1' },
        { userId, markerId, text: 'test2' },
      ]);

      comments.forEach((c, i) => {
        assert(c.userId.equals(userId));
        assert(c.markerId.equals(markerId));
        expect(c.text).equals(`test${i + 1}`);
      });
    });

    it('should create a comment on thread2', async () => {
      const markerId = markerThread2._id;
      const text = 'test3';
      const comment = await Comment.create({ userId, markerId, text });

      assert(comment.userId.equals(userId));
      assert(comment.markerId.equals(markerId));
      expect(comment.text).equals(text);

      commentOnThread2 = comment;
    });

    it('should reject nonexistent markerId', async () => {
      try {
        await Comment.create([
          { userId, markerId: new ObjectId(), text: 'test' },
        ]);
        assert.fail('should not reach here');
      } catch (err) {
        const { name } = err as Error;
        expect(name).equals('ValidationError');
      }
    });
  });

  describe('Comment Thread with Marker', () => {
    let Marker: MarkerModel;
    let Comment: CommentModel;

    before(async () => {
      Marker = db.models.Marker;
      Comment = db.models.Comment;
    });

    it('should also remove comments by removing marker', async () => {
      const markerId = markerThread1._id;
      let commentCount = await Comment.countDocuments({ markerId });
      expect(commentCount).equals(2);

      await markerThread1.remove();
      commentCount = await Comment.countDocuments({ markerId });
      expect(commentCount).equals(0);
    });

    it('should also remove marker by removing all comments', async () => {
      const { _id } = markerThread2;
      let markerExists = !!(await Marker.exists({ _id }));
      expect(markerExists).is.true;

      await commentOnThread2.remove();
      markerExists = !!(await Marker.exists({ _id }));
      expect(markerExists).is.false;
    });
  });
});

function reverse(str: string): string {
  return str.split('').reverse().join('');
}
