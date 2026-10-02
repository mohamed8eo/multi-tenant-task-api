import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
    @ApiProperty({ example: 'user@example.com', description: 'User email address' })
    @Transform(({ value }) => value?.trim().toLowerCase())
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'Password123!', description: 'User password' })
    @IsString()
    @IsNotEmpty()
    password: string;
}
