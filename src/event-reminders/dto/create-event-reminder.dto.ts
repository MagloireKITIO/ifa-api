import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEventReminderDto {
  @ApiProperty({
    description: 'ID of the event to set a reminder for',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  eventId: string;
}
