import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import * as grpc from '@grpc/grpc-js';
import {
  connect,
  Contract,
  Gateway,
  Identity,
  Signer,
  signers,
} from '@hyperledger/fabric-gateway';
import { readFileSync } from 'fs';
import { createPrivateKey } from 'crypto';

@Injectable()
export class FabricGatewayClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(FabricGatewayClient.name);

  private client?: grpc.Client;
  private gateway?: Gateway;
  private contract?: Contract;

  getContract(): Contract {
    if (!this.contract) {
      throw new Error('Fabric contract not initialized');
    }
    return this.contract;
  }

  async onModuleInit(): Promise<void> {
    await this.init();
  }

  private async init(): Promise<void> {
    const {
      FABRIC_MSP_ID,
      FABRIC_CHANNEL,
      FABRIC_CHAINCODE,
      FABRIC_PEER_ENDPOINT,
      FABRIC_TLS_CERT_PATH,
      FABRIC_IDENTITY_CERT_PATH,
      FABRIC_IDENTITY_KEY_PATH,
      FABRIC_PEER_HOST_ALIAS,
    } = process.env;

    if (
      !FABRIC_MSP_ID ||
      !FABRIC_CHANNEL ||
      !FABRIC_CHAINCODE ||
      !FABRIC_PEER_ENDPOINT ||
      !FABRIC_TLS_CERT_PATH ||
      !FABRIC_IDENTITY_CERT_PATH ||
      !FABRIC_IDENTITY_KEY_PATH
    ) {
      throw new Error(
        'Missing required Fabric environment variables. Check configuration.',
      );
    }

    this.logger.log('Initializing Fabric Gateway connection...');

    const tlsCert = readFileSync(FABRIC_TLS_CERT_PATH);
    const identityCert = readFileSync(FABRIC_IDENTITY_CERT_PATH);
    const identityKeyPem = readFileSync(FABRIC_IDENTITY_KEY_PATH);

    const identity: Identity = {
      mspId: FABRIC_MSP_ID,
      credentials: identityCert,
    };

    const privateKey = createPrivateKey(identityKeyPem);
    const signer: Signer = signers.newPrivateKeySigner(privateKey);

    const sslCredentials = grpc.credentials.createSsl(tlsCert);

    this.client = new grpc.Client(
      FABRIC_PEER_ENDPOINT,
      sslCredentials,
      {
        'grpc.ssl_target_name_override': FABRIC_PEER_HOST_ALIAS || undefined,
        'grpc.default_authority': FABRIC_PEER_HOST_ALIAS || undefined,
        'grpc.keepalive_time_ms': 60000,
        'grpc.keepalive_timeout_ms': 20000,
        'grpc.keepalive_permit_without_calls': 1,
        'grpc.http2.max_pings_without_data': 0,
      },
    );

    await new Promise<void>((resolve, reject) => {
      this.client!.waitForReady(
        Date.now() + 10000,
        (err?: Error) => {
          if (err) {
            reject(err);
          } else {
            resolve();
          }
        },
      );
    });

    this.gateway = connect({
      client: this.client,
      identity,
      signer,
      evaluateOptions: () => ({ deadline: Date.now() + 5000 }),
      endorseOptions: () => ({ deadline: Date.now() + 10000 }),
      submitOptions: () => ({ deadline: Date.now() + 15000 }),
      commitStatusOptions: () => ({ deadline: Date.now() + 20000 }),
    });

    const network = this.gateway.getNetwork(FABRIC_CHANNEL);
    this.contract = network.getContract(FABRIC_CHAINCODE);

    this.logger.log('Fabric Gateway successfully connected.');
  }

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Closing Fabric Gateway connection...');
    try {
      this.gateway?.close();
    } catch (err) {
      this.logger.error('Error closing gateway', err);
    }
    try {
      this.client?.close();
    } catch (err) {
      this.logger.error('Error closing gRPC client', err);
    }
  }
}