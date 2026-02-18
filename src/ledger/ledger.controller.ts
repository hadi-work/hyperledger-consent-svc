import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { CreateConsentEventDto } from './dto/create-consent-event.dto';

@Controller('ledger/consents')
export class LedgerController {
  constructor(private readonly svc: LedgerService) {}

  @Post('events')
  create(@Body() dto: CreateConsentEventDto) {
    return this.svc.createEvent(dto);
  }

  @Get(':consentRequestId/latest')
  latest(@Param('consentRequestId') consentRequestId: string) {
    return this.svc.getLatest(consentRequestId);
  }

  @Get(':consentRequestId/history')
  history(@Param('consentRequestId') consentRequestId: string) {
    return this.svc.getHistory(consentRequestId);
  }
}