import { Expose } from 'class-transformer';
import { IsNotEmpty, IsString } from 'class-validator';

export default class SignInInput {
  @Expose()
  @IsNotEmpty()
  @IsString()
  username!: string;

  @Expose()
  @IsNotEmpty()
  @IsString()
  password!: string;
}
