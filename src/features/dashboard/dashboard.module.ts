import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmployeeEntity, LoanEntity, PayrollEntity } from '../../database/entities';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([EmployeeEntity, PayrollEntity, LoanEntity])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
