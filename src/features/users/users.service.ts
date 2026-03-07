import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../../database/entities';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
  ) {}

  findByUsernameOrEmail(usernameOrEmail: string) {
    return this.usersRepository
      .createQueryBuilder('u')
      .where('u.username = :usernameOrEmail', { usernameOrEmail })
      .orWhere('u.email = :usernameOrEmail', { usernameOrEmail })
      .getOne();
  }

  findById(id: number) {
    return this.usersRepository.findOne({ where: { id } });
  }

  async markSuccessfulLogin(userId: number) {
    await this.usersRepository.update(userId, {
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: new Date(),
    });
  }

  async registerFailedLogin(userId: number, previousAttempts: number) {
    const nextAttempts = previousAttempts + 1;
    await this.usersRepository.update(userId, {
      failedLoginAttempts: nextAttempts,
      lockedUntil: nextAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null,
    });
  }

  async updatePassword(userId: number, passwordHash: string) {
    await this.usersRepository.update(userId, {
      passwordHash,
      passwordAlgo: 'argon2id',
      passwordUpdatedAt: new Date(),
      mustChangePassword: false,
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
  }
}
