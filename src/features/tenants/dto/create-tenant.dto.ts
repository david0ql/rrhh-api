import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @IsNotEmpty()
  @Length(2, 120)
  name!: string;

  @IsString()
  @IsNotEmpty()
  @Length(2, 180)
  legalName!: string;

  @IsString()
  @IsNotEmpty()
  @Length(3, 40)
  taxId!: string;

  @IsOptional()
  @IsString()
  @Length(2, 60)
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug solo permite minúsculas, números y guiones',
  })
  slug?: string;
}
