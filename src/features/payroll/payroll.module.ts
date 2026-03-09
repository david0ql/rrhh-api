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
import { TenantsModule } from '../tenants/tenants.module';
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
    TenantsModule,
  ],
  controllers: [PayrollController],
  providers: [PayrollService],
})
export class PayrollModule {}
