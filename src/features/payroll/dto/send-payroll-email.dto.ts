import { IsEmail, IsOptional, IsString } from 'class-validator';

export class SendPayrollEmailDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  cc?: string;
}
