import type { TaskPriority, TaskStatus } from "../../db/schema/tasks.js";

export class CreateTaskDto {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority

}
