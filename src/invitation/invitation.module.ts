import { Module } from '@nestjs/common';
import { InvitationService } from './invitation.service.js';
import { InvitationController } from './invitation.controller.js';

@Module({
  providers: [InvitationService],
  controllers: [InvitationController]
})
export class InvitationModule {}
