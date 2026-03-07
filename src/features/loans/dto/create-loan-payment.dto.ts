import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateLoanPaymentDto {
  @Type(() => Number)
  @IsInt()
  loanId!: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  payrollId?: number;

  @IsDateString()
  paymentDate!: string;

  @IsNumber()
  @Min(1)
  amount!: number;

  @IsOptional()
  @IsIn(['NOMINA', 'CAJA', 'TRANSFERENCIA'])
  source?: 'NOMINA' | 'CAJA' | 'TRANSFERENCIA';

  @IsOptional()
  @IsString()
  notes?: string;
}
