// import { Injectable } from '@nestjs/common';
// import { FabricGatewayClient } from '../fabric/fabric-gateway.client';
// import { CreateConsentEventDto } from './dto/create-consent-event.dto';
// import { createHash } from 'crypto';
// import { v4 as uuid } from 'uuid';
// import {unit8ArrayToJson} from "../core/helpers/object-converter.helper";
//
// function sha256(s: string) {
//   return createHash('sha256').update(s).digest('hex');
// }
//
// function normalizeIsoUtc(iso: string) {
//   const d = new Date(iso);
//   if (Number.isNaN(d.getTime())) throw new Error('Invalid datetime');
//   return d.toISOString(); // forces UTC + normalization
// }
//
// @Injectable()
// export class LedgerService {
//   constructor(private readonly fabric: FabricGatewayClient) {}
//
//   async createEvent(dto: CreateConsentEventDto) {
//     const datetime = normalizeIsoUtc(dto.datetime);
//
//     const consentRequestId = sha256(`${dto.customerID}|${dto.participantID}|${datetime}`);
//     const sharedKycHash = sha256(dto.sharedKYCPart);
//
//     // Determine previousEventId by reading latest from chain
//     const contract = this.fabric.getContract();
//     const latestBytes = await contract.evaluateTransaction('GetLatestConsent', consentRequestId);
//     // const latest = latestBytes.length ? JSON.parse(latestBytes.toString()) : null;
//     const latest = unit8ArrayToJson(latestBytes);
//
//     const eventId = uuid();
//
//     const payload = {
//       eventId,
//       consentRequestId,
//       statusIndicator: dto.statusIndicator,
//       customerID: dto.customerID,
//       participantID: dto.participantID,
//       datetime,
//       communicationChannel: dto.communicationChannel,
//       sharedKycHash,
//       previousEventId: latest?.eventId || undefined
//     };
//
//     const resultBytes = await contract.submitTransaction('CreateConsentEvent', JSON.stringify(payload));
//     // const result = JSON.parse(resultBytes.toString());
//     const result = unit8ArrayToJson(resultBytes);
//
//     return {
//       ...result,
//       sharedKycHash
//     };
//   }
//
//   async getLatest(consentRequestId: string) {
//     const contract = this.fabric.getContract();
//     const bytes = await contract.evaluateTransaction('GetLatestConsent', consentRequestId);
//
//     return unit8ArrayToJson(bytes);
//     // return bytes.length ? JSON.parse(bytes.toString()) : null;
//   }
//
//   async getHistory(consentRequestId: string) {
//     const contract = this.fabric.getContract();
//     const bytes = await contract.evaluateTransaction('GetConsentHistory', consentRequestId);
//     return unit8ArrayToJson(bytes);
//     // return bytes.length ? JSON.parse(bytes.toString()) : [];
//   }
// }