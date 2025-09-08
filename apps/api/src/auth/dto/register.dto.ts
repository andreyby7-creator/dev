import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsString,
  IsOptional,
  MinLength,
  IsEnum,
} from 'class-validator';
import { UserRole } from '../../types/roles';

export class RegisterDto {
  @ApiProperty({ description: 'Email пользователя' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Пароль пользователя', minLength: 6 })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({
    description: 'Роль пользователя',
    enum: UserRole,
    default: UserRole.USER,
  })
  @IsEnum(UserRole)
  @IsOptional()
  role?: UserRole;

  @ApiProperty({ description: 'Имя пользователя', required: false })
  @IsString()
  @IsOptional()
  firstName?: string;

  @ApiProperty({ description: 'Фамилия пользователя', required: false })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ description: 'Телефон пользователя', required: false })
  @IsString()
  @IsOptional()
  phone?: string;
}
