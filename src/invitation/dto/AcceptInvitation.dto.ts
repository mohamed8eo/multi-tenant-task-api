import { IsNotEmpty, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptInvitationDto {
    @ApiProperty({
        example: '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08',
        description: 'Invitation token issued at creation time',
    })
    @IsString()
    @IsNotEmpty()
    @Matches(/^[0-9a-f]{64}$/, { message: 'Invalid invitation token' })
    token: string;
}
