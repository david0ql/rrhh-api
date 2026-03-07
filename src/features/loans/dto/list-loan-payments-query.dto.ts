import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/pagination';

export enum LoanPaymentOrderBy {
  ID = 'id',
  PAYMENT_DATE = 'paymentDate',
  AMOUNT = 'amount',
  SOURCE = 'source',
  CREATED_AT = 'createdAt',
}

export class ListLoanPaymentsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(LoanPaymentOrderBy)
  orderBy: LoanPaymentOrderBy = LoanPaymentOrderBy.ID;
}
