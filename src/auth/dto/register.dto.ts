import {
    IsEmail,
    IsString,
    IsStrongPassword,
    Length,
    Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
    @ApiProperty({ example: 'user@example.com', description: 'User email address' })
    @Transform(({ value }) => value?.trim().toLowerCase())
    @IsEmail()
    email: string;

    @ApiProperty({ example: 'test_user', description: 'Unique username (3-20 characters)' })
    @Transform(({ value }) => value?.trim().toLowerCase())
    @IsString()
    @Matches(/^[a-z0-9_]{3,20}$/, {
        message: 'username must be 3-20 characters: lowercase letters, numbers, underscore',
    })
    username: string;

    @ApiProperty({ example: 'Test User', description: 'Full name' })
    @IsString()
    @Length(2, 100)
    name: string;

    @ApiProperty({ example: 'Password123!', description: 'Strong password' })
    @IsString()
    @IsStrongPassword()
    password: string;
}
