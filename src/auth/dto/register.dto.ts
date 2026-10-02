import {
    IsEmail,
    IsString,
    IsStrongPassword,
    Length,
    Matches,
} from 'class-validator';

export class RegisterDto {
    @IsEmail()
    email: string;

    @IsString()
    @Matches(/^[a-z0-9_]{3,20}$/, {
        message: 'username must be 3-20 characters: lowercase letters, numbers, underscore',
    })
    username: string;

    @IsString()
    @Length(2, 100)
    name: string;

    @IsString()
    @IsStrongPassword()
    password: string;
}
