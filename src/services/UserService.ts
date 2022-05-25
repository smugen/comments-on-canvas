import { transformAndValidate } from 'class-transformer-validator';
import {
  SignOptions,
  VerifyOptions,
  decode as jwtDecode,
  sign as jwtSign,
  verify as jwtVerify,
} from 'jsonwebtoken';
import Koa from 'koa';
import ms from 'ms';
import { Inject, Service } from 'typedi';

import { ApiContext } from '../helpers/apiMiddleware';
import logger from '../logger';
import { UserDocument } from '../models';
import AddUserInput from '../types/AddUserInput';
import AddUserOutput from '../types/AddUserOutput';
import SignInError from '../types/SignInError';
import SignInInput from '../types/SignInInput';
import SignInOutput from '../types/SignInOutput';
import TokenClaims from '../types/TokenClaims';
import MongooseDatabase from './MongooseDatabase';

const TOKEN_COOKIE_NAME = 'CYToken';
const TOKEN_TYPE = 'Bearer';
const TOKEN_EXPIRES_IN = ms('8h');

@Service()
export default class UserService {
  constructor(
    @Inject(() => MongooseDatabase)
    private readonly db: MongooseDatabase,
  ) {}

  async authenticate(ctx: Koa.Context): Promise<UserDocument | undefined> {
    const TAG = 'UserService.authenticate';
    const token = getToken(ctx);
    if (!token) {
      return;
    }

    let decoded: TokenClaims;
    try {
      const dec = jwtDecode(token);
      if (!dec || typeof dec !== 'object') {
        throw new TypeError(`Malformed claims ${dec}`);
      }

      decoded = await transformAndValidate(TokenClaims, dec);
    } catch (err) {
      logger.warn(TAG, { error: err });
      return;
    }

    const { sub: id } = decoded;
    let user: UserDocument | undefined;

    try {
      const doc = await this.db.UserModel.findById(id);
      if (doc) {
        const secret = doc.password.derivedKey;
        const verified = await verifyJWT(token, secret);
        if (verified) {
          await transformAndValidate(TokenClaims, verified);
          user = doc;
        }
      }
    } catch (err) {
      logger.warn(TAG, { id, err });
    }

    return user;
  }

  async signIn(
    { username, password }: SignInInput,
    ctx: ApiContext<SignInInput, SignInOutput>,
  ): Promise<SignInOutput> {
    const TAG = 'UserService.signIn';
    const user =
      (await this.db.UserModel.verify(username, password)) ??
      (() => {
        const err = new SignInError(username);
        logger.warn(TAG, { err });
        throw err;
      })();

    const claims = new TokenClaims(user);
    const secret = user.password.derivedKey;
    const cyToken = await signJWT(claims, secret, {
      expiresIn: TOKEN_EXPIRES_IN / 1000,
    });
    if (!cyToken) {
      throw new Error(`Sign JWT got token ${cyToken}`);
    }

    ctx.cookies.set(TOKEN_COOKIE_NAME, cyToken, {
      httpOnly: true,
      maxAge: TOKEN_EXPIRES_IN,
      secure: ctx.secure,
    });

    logger.info(TAG, { username });
    return { user, cyToken };
  }

  signOut(ctx: Koa.Context) {
    ctx.cookies.set(TOKEN_COOKIE_NAME, '');
  }

  async addUser({
    name,
    username,
    password,
  }: AddUserInput): Promise<AddUserOutput> {
    const user = await (
      await new this.db.UserModel({ name, username }).setPassword(password)
    ).save();
    return { user, password };
  }
}

function getToken(ctx: Koa.Context): string | undefined {
  const [type, token] = ctx.get('Authorization')?.split(' ') ?? [];
  if (type === TOKEN_TYPE && token && typeof token === 'string') {
    return token;
  }
  return ctx.cookies.get(TOKEN_COOKIE_NAME);
}

function verifyJWT(
  token: string,
  secret: Buffer,
  opts?: VerifyOptions,
): Promise<Record<string, unknown> | undefined> {
  return new Promise((res, rej) => {
    jwtVerify(token, secret, opts, (err, verified) =>
      err ? rej(err) : res(verified as Record<string, unknown> | undefined),
    );
  });
}

function signJWT(
  claims: TokenClaims,
  secret: Buffer,
  opts: SignOptions,
): Promise<string | undefined> {
  return new Promise((res, rej) => {
    jwtSign({ ...claims }, secret, opts, (err, encoded) =>
      err ? rej(err) : res(encoded),
    );
  });
}
