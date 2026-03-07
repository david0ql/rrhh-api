import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/pagination';

export enum PayrollOrderBy {
  ID = 'id',
  YEAR = 'year',
  MONTH = 'month',
  NET_PAY = 'netPay',
  PAYMENT_DATE = 'paymentDate',
  CREATED_AT = 'createdAt',
}

export class ListPayrollQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(PayrollOrderBy)
  orderBy: PayrollOrderBy = PayrollOrderBy.ID;
}
