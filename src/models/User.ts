import {
  randomBytes as cryptoRandomBytes,
  scrypt as cryptoScrypt,
} from 'crypto';
import { promisify } from 'util';

import {
  DocumentType,
  ReturnModelType,
  defaultClasses,
  modelOptions,
  prop,
} from '@typegoose/typegoose';
import { isEmail } from 'class-validator';

const randomBytes = promisify(cryptoRandomBytes);
const scrypt = promisify(cryptoScrypt);

const USERNAME_MIN_LEN = 3;
const SALT_LEN = 16;
const KEY_LEN = 64;

export type UserDocument = DocumentType<User>;
export type UserModel = ReturnModelType<typeof User>;

/**
 * `scrypt` password-based key derivation
 * @see https://en.wikipedia.org/wiki/Scrypt
 * @see https://zh.wikipedia.org/wiki/Scrypt
 */
@modelOptions({
  schemaOptions: {
    _id: false,
    toObject: { transform: transformPassword },
    toJSON: { transform: transformPassword },
  },
})
class ScryptPassword {
  /**
   * {@link SALT_LEN} bytes long from
   *  {@link https://nodejs.org/dist/latest/docs/api/crypto.html#crypto_crypto_randombytes_size_callback | crypto.randomBytes}
   */
  @prop({ required: true })
  salt!: Buffer;

  /**
   * {@link KEY_LEN} bytes long from
   *  {@link https://nodejs.org/dist/latest/docs/api/crypto.html#crypto_crypto_scrypt_password_salt_keylen_options_callback | crypto.scrypt}
   */
  @prop({ required: true })
  derivedKey!: Buffer;

  /** timestamp when password hashed */
  @prop({ required: true })
  ts!: Date;
}

/** mask password salt and derivedKey */
function transformPassword(
  doc: ScryptPassword,
  ret: { salt: string; derivedKey: string },
) {
  const { salt, derivedKey } = doc;
  if (salt && salt.constructor && salt.constructor.name) {
    ret.salt = `${salt.constructor.name}(${salt.length})`;
  }
  if (derivedKey && derivedKey.constructor && derivedKey.constructor.name) {
    ret.derivedKey = `${derivedKey.constructor.name}(${derivedKey.length})`;
  }
  return ret;
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface User extends defaultClasses.Base {}

@modelOptions({
  schemaOptions: {
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        delete ret._id;
        delete ret.password;
        return ret;
      },
    },
    timestamps: {
      createdAt: true,
      updatedAt: true,
    },
  },
})
export class User extends defaultClasses.TimeStamps {
  /** name for display */
  @prop({ required: true, index: true })
  name!: string;

  /** username used for login */
  @prop({
    required: true,
    index: true,
    unique: true,
    minlength: USERNAME_MIN_LEN,
    validate: isEmail,
  })
  username!: string;

  /** `scrypt` password-based key derivation {@link IScryptPassword} */
  @prop({
    required: true,
    validate: ({ salt, derivedKey, ts }: ScryptPassword) =>
      salt &&
      Buffer.isBuffer(salt) &&
      salt.length === SALT_LEN &&
      derivedKey &&
      Buffer.isBuffer(derivedKey) &&
      derivedKey.length === KEY_LEN &&
      ts &&
      ts instanceof Date &&
      ts <= new Date(),
  })
  password!: ScryptPassword;

  async setPassword(
    this: UserDocument,
    password: string,
  ): Promise<UserDocument> {
    this.password = await hashPswd(password);
    return this;
  }

  async verifyPassword(this: UserDocument, password: string): Promise<boolean> {
    const { salt, derivedKey, ts } = this.password ?? {};
    if (
      !(
        salt &&
        Buffer.isBuffer(salt) &&
        salt.length === SALT_LEN &&
        derivedKey &&
        Buffer.isBuffer(derivedKey) &&
        derivedKey.length === KEY_LEN
      )
    ) {
      return false;
    }
    const {
      salt: hSalt,
      derivedKey: hDerivedKey,
      ts: hTs,
    } = await hashPswd(password, salt);
    return salt.equals(hSalt) && derivedKey.equals(hDerivedKey) && ts <= hTs;
  }

  static async verify(
    this: UserModel,
    username: string,
    password: string,
  ): Promise<UserDocument | null> {
    const user = await this.findOne({ username });
    if (!user) {
      return null;
    }
    const ok = await user.verifyPassword(password);
    return ok ? user : null;
  }
}

/**
 * hash password using `scrypt` password-based key derivation
 * @param password plain text to
 *  {@link https://nodejs.org/dist/latest/docs/api/crypto.html#crypto_crypto_scrypt_password_salt_keylen_options_callback | crypto.scrypt}
 * @param salt {Buffer} {@link SALT_LEN} bytes long for
 *  {@link https://nodejs.org/dist/latest/docs/api/crypto.html#crypto_crypto_scrypt_password_salt_keylen_options_callback | crypto.scrypt}
 */
async function hashPswd(
  password: string,
  salt?: Buffer,
): Promise<ScryptPassword> {
  if (!password || typeof password !== 'string') {
    throw new TypeError(`Bad password ${password}`);
  }
  if (!(salt && Buffer.isBuffer(salt) && salt.length === SALT_LEN)) {
    salt = await randomBytes(SALT_LEN);
  }
  return {
    salt,
    derivedKey: (await scrypt(password, salt, KEY_LEN)) as Buffer,
    ts: new Date(),
  };
}
