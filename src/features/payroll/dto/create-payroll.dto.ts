import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreatePayrollDto {
  @Type(() => Number)
  @IsInt()
  employeeId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1900)
  @Max(2100)
  year!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  month!: number;

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
  deductionHealth!: number;

  @IsNumber()
  @Min(0)
  deductionPension!: number;

  @IsNumber()
  @Min(0)
  deductionLoan!: number;

  @IsNumber()
  @Min(0)
  deductionOther!: number;

  @IsOptional()
  @IsString()
  notes?: string;

  /** ID del préstamo activo al que se aplicará deductionLoan como abono automático */
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  loanId?: number;
}
