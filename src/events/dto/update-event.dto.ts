import { PartialType } from '@nestjs/swagger';
import { CreateEventDto } from './create-event.dto';

/**
 * DTO for updating an existing event
 * All fields are optional (partial)
 */
export class UpdateEventDto extends PartialType(CreateEventDto) {}
