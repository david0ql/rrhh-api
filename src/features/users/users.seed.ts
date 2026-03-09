import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { Repository } from 'typeorm';
import { UserEntity } from '../../database/entities';

@Injectable()
export class UsersSeedService implements OnModuleInit {
  constructor(
    @InjectRepository(UserEntity)
    private readonly usersRepository: Repository<UserEntity>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const username = this.configService.get<string>('ADMIN_USERNAME', 'admin');
    const email = this.configService.get<string>(
      'ADMIN_EMAIL',
      'admin@dally.local',
    );
    const password = this.configService.get<string>(
      'ADMIN_PASSWORD',
      'admin123',
    );

    const existingUser = await this.usersRepository.findOne({
      where: { username },
    });
    if (existingUser) {
      return;
    }

    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

    const user = this.usersRepository.create({
      username,
      email,
      passwordHash,
      passwordAlgo: 'argon2id',
      isActive: true,
      isAdmin: true,
      mustChangePassword: false,
      failedLoginAttempts: 0,
      lockedUntil: null,
      lastLoginAt: null,
      passwordUpdatedAt: new Date(),
    });

    await this.usersRepository.save(user);
  }
}
