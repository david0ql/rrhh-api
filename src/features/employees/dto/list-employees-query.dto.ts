import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../shared/pagination';

export enum EmployeeOrderBy {
  ID = 'id',
  FULL_NAME = 'fullName',
  HIRED_AT = 'hiredAt',
  BASE_SALARY = 'baseSalary',
  CREATED_AT = 'createdAt',
}

export class ListEmployeesQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(EmployeeOrderBy)
  orderBy: EmployeeOrderBy = EmployeeOrderBy.ID;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (value === true || value === 'true' || value === '1' || value === 1) return true;
    if (value === false || value === 'false' || value === '0' || value === 0) return false;
    return value;
  })
  @IsBoolean()
  isActive?: boolean;
}
