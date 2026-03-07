import { DocumentTypeEntity } from './document-type.entity';
import { EmployeeEntity } from './employee.entity';
import { LoanPaymentEntity } from './loan-payment.entity';
import { MandatoryEarningEntity } from './mandatory-earning.entity';
import { MandatoryDeductionEntity } from './mandatory-deduction.entity';
import { LoanStatusEntity } from './loan-status.entity';
import { LoanEntity } from './loan.entity';
import { PayrollEntity } from './payroll.entity';
import { UserEntity } from './user.entity';

export const databaseEntities = [
  DocumentTypeEntity,
  LoanStatusEntity,
  UserEntity,
  EmployeeEntity,
  PayrollEntity,
  LoanEntity,
  LoanPaymentEntity,
  MandatoryEarningEntity,
  MandatoryDeductionEntity,
];

export {
  DocumentTypeEntity,
  EmployeeEntity,
  LoanEntity,
  LoanPaymentEntity,
  MandatoryEarningEntity,
  LoanStatusEntity,
  MandatoryDeductionEntity,
  PayrollEntity,
  UserEntity,
};
