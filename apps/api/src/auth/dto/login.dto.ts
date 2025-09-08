import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email пользователя',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'password123', description: 'Пароль пользователя' })
  @IsString()
  @MinLength(6)
  password!: string;
}
