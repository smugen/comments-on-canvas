import { Expose } from 'class-transformer';
import { IsString } from 'class-validator';

export default class PackageJson {
  @Expose()
  @IsString()
  name!: string;

  @Expose()
  @IsString()
  description!: string;

  @Expose()
  @IsString()
  version!: string;
}
