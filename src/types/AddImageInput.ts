import { Expose } from 'class-transformer';
import { IsInt, IsOptional, IsString } from 'class-validator';

export default class AddImageInput {
  @Expose()
  @IsString()
  extension!: string;

  @Expose()
  @IsOptional()
  @IsInt()
  x?: number;

  @Expose()
  @IsOptional()
  @IsInt()
  y?: number;
}
