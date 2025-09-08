import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsBoolean } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ description: 'Email пользователя' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Имя пользователя' })
  @IsString()
  firstName!: string;

  @ApiProperty({ description: 'Фамилия пользователя' })
  @IsString()
  lastName!: string;

  @ApiProperty({ description: 'Телефон пользователя', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Активен ли пользователь', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
