import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { FabricGatewayClient } from '../fabric/fabric-gateway.client';
import { CreateConsentEventDto } from './dto/create-consent-event.dto';
import { createHash } from 'crypto';
import { v4 as uuid } from 'uuid';
import {unit8ArrayToJson} from "../core/helpers/object-converter.helper";

function sha256(s: string) {
  return createHash('sha256').update(s).digest('hex');
}

function normalizeIsoUtc(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) throw new Error('Invalid datetime');
  return d.toISOString(); // forces UTC + normalization
}

@Injectable()
export class LedgerService {
  constructor(private readonly fabric: FabricGatewayClient) {}

  private readonly logger = new Logger(LedgerService.name);

  // private mapFabricError(error: any) {
  //   console.log(error?.details?.pop()?.message)
  // }
  private mapFabricError(error: any): never {
    // const message = error?.message || 'Unknown Fabric error';
    const message = error?.details?.pop()?.message || 'Unknown Fabric error';

    // Endorsement failures
    if (message.includes('ENDORSEMENT_POLICY_FAILURE')) {
      throw new HttpException(
        { code: 'ENDORSEMENT_FAILURE', message: 'Transaction endorsement failed' },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Chaincode validation errors (business rule violations)
    if (message.includes('previousEventId') ||
      message.includes('revoked only allowed') ||
      message.includes('First status must be') ||
      message.includes('Cannot append events')) {
      throw new HttpException(
        { code: 'CONSENT_RULE_VIOLATION', message },
        HttpStatus.BAD_REQUEST,
      );
    }

    // Duplicate event
    if (message.includes('Event already exists')) {
      throw new HttpException(
        { code: 'DUPLICATE_EVENT', message: 'Consent event already recorded' },
        HttpStatus.CONFLICT,
      );
    }

    // Gateway / gRPC level failures
    if (message.includes('failed to connect') ||
      message.includes('deadline exceeded') ||
      message.includes('UNAVAILABLE')) {
      throw new HttpException(
        { code: 'FABRIC_UNAVAILABLE', message: 'Blockchain network unavailable' },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    // Fallback
    this.logger.error('Unhandled Fabric error', error);
    throw new HttpException(
      { code: 'FABRIC_ERROR', message: 'Blockchain transaction failed' },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  async createEvent(dto: CreateConsentEventDto) {
    try {
      const datetime = normalizeIsoUtc(dto.datetime);

      const consentRequestId = sha256(`${dto.customerID}|${dto.participantID}|${datetime}`);
      const sharedKycHash = sha256(dto.sharedKYCPart);

      const contract = this.fabric.getContract();
      const latestBytes = await contract.evaluateTransaction('GetLatestConsent', consentRequestId);
      const latest = latestBytes.length ? unit8ArrayToJson(latestBytes) : null;

      const eventId = uuid();

      const payload = {
        eventId,
        consentRequestId,
        statusIndicator: dto.statusIndicator,
        customerID: dto.customerID,
        participantID: dto.participantID,
        datetime,
        communicationChannel: dto.communicationChannel,
        sharedKycHash,
        previousEventId: latest?.eventId || undefined
      };

      const resultBytes = await contract.submitTransaction(
        'CreateConsentEvent',
        JSON.stringify(payload)
      );

      const result = resultBytes.length ? unit8ArrayToJson(resultBytes) : null;

      return {
        ...result,
        sharedKycHash
      };
    } catch (error) {
      this.mapFabricError(error);
    }
  }

  async getLatest(consentRequestId: string) {
    try {
      const contract = this.fabric.getContract();
      const bytes = await contract.evaluateTransaction('GetLatestConsent', consentRequestId);
      return bytes.length ? unit8ArrayToJson(bytes) : null;
    } catch (error) {
      this.mapFabricError(error);
    }
  }

  async getHistory(consentRequestId: string) {
    try {
      const contract = this.fabric.getContract();
      const bytes = await contract.evaluateTransaction('GetConsentHistory', consentRequestId);
      return bytes.length ? unit8ArrayToJson(bytes) : [];
    } catch (error) {
      this.mapFabricError(error);
    }
  }
}