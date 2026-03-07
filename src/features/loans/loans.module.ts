import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  EmployeeEntity,
  LoanEntity,
  LoanPaymentEntity,
  PayrollEntity,
} from '../../database/entities';
import { LoansController } from './loans.controller';
import { LoansService } from './loans.service';

@Module({
  imports: [TypeOrmModule.forFeature([LoanEntity, LoanPaymentEntity, EmployeeEntity, PayrollEntity])],
  controllers: [LoansController],
  providers: [LoansService],
})
export class LoansModule {}
