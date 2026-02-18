import { Module, OnModuleInit } from '@nestjs/common';
import { FabricGatewayClient } from './fabric/fabric-gateway.client';
import { LedgerController } from './ledger/ledger.controller';
import { LedgerService } from './ledger/ledger.service';
import {ConfigModule} from "@nestjs/config";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,   // makes it available everywhere
    }),
  ],
  controllers: [LedgerController],
  providers: [FabricGatewayClient, LedgerService],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly fabric: FabricGatewayClient) {}
  async onModuleInit() {
    await this.fabric.init();
  }
}