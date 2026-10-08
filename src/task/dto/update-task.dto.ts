import { PartialType } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto.js';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
    title?: string | undefined;
    description?: string | undefined;
    status?: 'todo' | 'in_progress' | 'done' | undefined;
    priority?: 'low' | 'medium' | 'high' | undefined;
}
