import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { UserEntity } from '../../database/entities';
import { UsersService } from '../users/users.service';
import { JwtPayload } from './jwt-payload.type';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(usernameOrEmail: string, pass: string) {
    const user = await this.usersService.findByUsernameOrEmail(usernameOrEmail);

    if (!user || !user.isActive) {
      return null;
    }

    if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
      throw new UnauthorizedException('Usuario bloqueado temporalmente');
    }

    const isValidPassword = await argon2.verify(user.passwordHash, pass);
    if (!isValidPassword) {
      await this.usersService.registerFailedLogin(
        user.id,
        user.failedLoginAttempts,
      );
      return null;
    }

    await this.usersService.markSuccessfulLogin(user.id);

    return this.sanitizeUser(user);
  }

  async login(user: ReturnType<AuthService['sanitizeUser']>) {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      isAdmin: user.isAdmin,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
      token_type: 'Bearer',
      user,
    };
  }

  async me(userId: number) {
    const user = await this.usersService.findById(userId);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario no valido');
    }

    return this.sanitizeUser(user);
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.usersService.findById(userId);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Usuario no valido');
    }

    const currentValid = await argon2.verify(
      user.passwordHash,
      currentPassword,
    );
    if (!currentValid) {
      throw new UnauthorizedException('La contraseña actual es incorrecta');
    }

    if (currentPassword === newPassword) {
      throw new BadRequestException('La nueva contraseña debe ser diferente');
    }

    const newHash = await argon2.hash(newPassword, { type: argon2.argon2id });
    await this.usersService.updatePassword(user.id, newHash);

    return { success: true, message: 'Contraseña actualizada correctamente' };
  }

  private sanitizeUser(user: UserEntity) {
    return {
      id: user.id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin,
      mustChangePassword: user.mustChangePassword,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
