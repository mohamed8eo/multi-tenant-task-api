import { PartialType } from '@nestjs/swagger';
import { CreateProjectDto } from './create-project.dto.js';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
    name?: string | undefined;
    description?: string | undefined;
    status?: 'active' | 'archived' | undefined;
}
