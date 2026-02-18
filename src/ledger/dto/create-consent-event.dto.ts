export class CreateConsentEventDto {
  statusIndicator!: 'accepted' | 'rejected' | 'revoked';
  customerID!: string;
  participantID!: string;
  datetime!: string; // ISO
  communicationChannel!: string;
  sharedKYCPart!: string; // raw (we hash it before on-chain)
}