import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/pagination';

export enum LoanOrderBy {
  ID = 'id',
  START_DATE = 'startDate',
  PRINCIPAL_AMOUNT = 'principalAmount',
  PAID_AMOUNT = 'paidAmount',
  BALANCE = 'balance',
  STATUS = 'status',
  CREATED_AT = 'createdAt',
}

export class ListLoansQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(LoanOrderBy)
  orderBy: LoanOrderBy = LoanOrderBy.ID;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  employeeId?: number;

  @IsOptional()
  @IsIn(['ACTIVO', 'PAGADO', 'CANCELADO'])
  status?: 'ACTIVO' | 'PAGADO' | 'CANCELADO';
}
