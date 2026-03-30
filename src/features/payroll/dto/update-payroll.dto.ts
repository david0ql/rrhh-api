import { Type } from 'class-transformer';
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdatePayrollDto {
  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @IsNumber()
  @Min(0)
  @Max(31)
  daysWorked!: number;

  @IsNumber()
  @Min(0)
  earnedSalary!: number;

  @IsNumber()
  @Min(0)
  earnedExtras!: number;

  @IsNumber()
  @Min(0)
  deductionLoan!: number;

  @IsNumber()
  @Min(0)
  deductionOther!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
