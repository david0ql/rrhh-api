import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseEntities } from './database/entities';
import { AuthModule } from './features/auth/auth.module';
import { DashboardModule } from './features/dashboard/dashboard.module';
import { EmployeesModule } from './features/employees/employees.module';
import { HealthModule } from './features/health/health.module';
import { LoansModule } from './features/loans/loans.module';
import { PayrollModule } from './features/payroll/payroll.module';
import { TenantsModule } from './features/tenants/tenants.module';
import { UsersModule } from './features/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'mariadb',
        host: configService.get<string>('DB_HOST', '127.0.0.1'),
        port: configService.get<number>('DB_PORT', 3306),
        username: configService.get<string>('DB_USER', 'root'),
        password: configService.get<string>('DB_PASSWORD', ''),
        database: configService.get<string>('DB_NAME', 'dbamovil_rrhh'),
        entities: databaseEntities,
        synchronize: false,
        logging: configService.get<string>('DB_LOGGING', 'false') === 'true',
        timezone: 'Z',
      }),
    }),
    HealthModule,
    UsersModule,
    AuthModule,
    DashboardModule,
    TenantsModule,
    EmployeesModule,
    PayrollModule,
    LoansModule,
  ],
})
export class AppModule {}
