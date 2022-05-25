import { Expose } from 'class-transformer';
import { Equals, IsIn, IsMongoId, IsNotEmpty, IsString } from 'class-validator';

import { UserDocument } from '../models';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const packageName = require('../../package.json').name;

/** @see https://auth0.com/docs/tokens/json-web-tokens/json-web-token-claims */
export default class TokenClaims {
  /** issuer */
  @Expose()
  @Equals(packageName)
  readonly iss: string = packageName;

  /** subject (user id) */
  @Expose()
  @IsMongoId()
  readonly sub: string;

  /** audience */
  @Expose()
  @IsIn(['user'])
  readonly aud = 'user';

  /** username */
  @Expose()
  @IsNotEmpty()
  @IsString()
  readonly username: string;

  constructor(user?: UserDocument) {
    this.sub = user?.id ?? '';
    this.username = user?.username ?? '';
  }
}
