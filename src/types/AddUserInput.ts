import { Expose } from 'class-transformer';
import { IsString } from 'class-validator';

export default class AddUserInput {
  @Expose()
  @IsString()
  name!: string;

  @Expose()
  @IsString()
  username!: string;

  @Expose()
  @IsString()
  password!: string;
}
