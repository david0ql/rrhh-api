import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  EmployeeEntity,
  LoanEntity,
  PayrollEntity,
} from '../../database/entities';
import { TenantsModule } from '../tenants/tenants.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmployeeEntity, PayrollEntity, LoanEntity]),
    TenantsModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
