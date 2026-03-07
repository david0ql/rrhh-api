import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateLoanDto {
  @Type(() => Number)
  @IsInt()
  employeeId!: number;

  @IsDateString()
  startDate!: string;

  @IsNumber()
  @Min(1)
  principalAmount!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  suggestedInstallmentAmount?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
