import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  EmployeeEntity,
  LoanEntity,
  LoanPaymentEntity,
  MandatoryDeductionEntity,
  MandatoryEarningEntity,
  PayrollEntity,
} from '../../database/entities';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PayrollEntity,
      EmployeeEntity,
      LoanEntity,
      LoanPaymentEntity,
      MandatoryDeductionEntity,
      MandatoryEarningEntity,
    ]),
  ],
  controllers: [PayrollController],
  providers: [PayrollService],
})
export class PayrollModule {}
