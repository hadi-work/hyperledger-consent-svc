import { Injectable, OnModuleDestroy } from '@nestjs/common';
import * as grpc from '@grpc/grpc-js';
import { connect, Contract, Gateway, Identity, Signer, signers } from '@hyperledger/fabric-gateway';
import { readFileSync } from 'fs';
import { createPrivateKey } from 'crypto';

@Injectable()
export class FabricGatewayClient implements OnModuleDestroy {
  private client?: grpc.Client;
  private gateway?: Gateway;
  private contract?: Contract;

  getContract(): Contract {
    if (!this.contract) throw new Error('Fabric contract not initialized');
    return this.contract;
  }

  async init() {
    const mspId = process.env.FABRIC_MSP_ID!;
    const channel = process.env.FABRIC_CHANNEL!;
    const chaincode = process.env.FABRIC_CHAINCODE!;
    const peerEndpoint = process.env.FABRIC_PEER_ENDPOINT!;

    const tlsCert = readFileSync(process.env.FABRIC_TLS_CERT_PATH!);
    const identityCert = readFileSync(process.env.FABRIC_IDENTITY_CERT_PATH!);
    const identityKeyPem = readFileSync(process.env.FABRIC_IDENTITY_KEY_PATH!);

    const identity: Identity = {
      mspId,
      credentials: identityCert
    };

    const privateKey = createPrivateKey(identityKeyPem);
    const signer: Signer = signers.newPrivateKeySigner(privateKey);

    // gRPC TLS channel to peer gateway
    this.client = new grpc.Client(
      peerEndpoint,
      grpc.credentials.createSsl(tlsCert)
    );

    this.gateway = connect({
      client: this.client,
      identity,
      signer,
      // optional: tune timeouts/retries later
    });

    const network = this.gateway.getNetwork(channel);
    this.contract = network.getContract(chaincode);
  }

  async onModuleDestroy() {
    try { this.gateway?.close(); } catch {}
    try { (this.client as any)?.close?.(); } catch {}
  }
}