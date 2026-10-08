import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Length } from 'class-validator';

export class CreateCommentDto {
    @ApiProperty({ example: 'Looks good! Ready for review.', maxLength: 2000 })
    @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
    @IsString()
    @Length(1, 2000)
    body: string;
}
