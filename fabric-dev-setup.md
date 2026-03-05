````markdown
# Hyperledger Fabric Setup Guide – Consent Ledger

This document describes the steps required to set up the **Hyperledger Fabric environment** and deploy the **Consent Ledger chaincode**.

---

# 1. Development Prerequisites

Ensure the following tools are installed on your machine:

- **Docker**
- **Docker Compose**
- **Node.js 18+**
- **Git**
- **Make** *(optional but recommended)*

---

# 2. Install Fabric Samples, Binaries, and Docker Images

Hyperledger Fabric provides an installation script that downloads:

- `fabric-samples`
- Fabric binaries (`peer`, `orderer`, `configtxgen`, etc.)
- Required Docker images

### Create Working Directory

```bash
mkdir -p ~/work/consent-ledger/fabric
cd ~/work/consent-ledger/fabric
````

### Run Fabric Installation Script

```bash
# Downloads fabric-samples + binaries + docker images
curl -sSL https://bit.ly/2ysbOFE | bash -s -- 2.5.0 1.5.7
```

### Docker Images Pulled

```
hyperledger/fabric-peer:2.5.0
hyperledger/fabric-orderer:2.5.0
hyperledger/fabric-ccenv:2.5.0
hyperledger/fabric-baseos:2.5.0
hyperledger/fabric-ca:1.5.7
```

### Clone chaincode

Clone chaincode from below repo and keep in separate folder outside fabric-samples

https://github.com/hadi-work/fabric-hyperledger-chaincode
---

# 3. Configure Test Network

Navigate to the test network directory:

```bash
cd fabric-samples/test-network
```

Open the following file:

```
fabric-samples/test-network/compose/docker/peercfg/core.yml
```

### Modify Chaincode Mode

Change:

```yaml
chaincode:
  mode: docker
```

### Comment External Builders Section

```yaml
# externalBuilders:
#   - name: ccaas_builder
#     path: /opt/hyperledger/ccaas_builder
#     propagateEnvironment:
#       - CHAINCODE_AS_A_SERVICE_BUILDER_CONFIG
```

---

# 4. Running the Fabric Network

Update the paths according to your system before running the commands.

---

# Step 1 — Clean Previous Network

```bash
./network.sh down && \
rm -rf channel-artifacts system-genesis-block "*.block" "*.tx" && \
docker volume prune -f && \
docker container prune -f
```

---

# Step 2 — Start Network and Deploy Chaincode

### Start Network with Certificate Authorities

```bash
./network.sh up -ca
```

### Create Channel

```bash
./network.sh createChannel -c consentchannel
```

### Deploy Chaincode

```bash
./network.sh deployCC \
  -c consentchannel \
  -ccn consent-ledger \
  -ccp /Users/haiderali/Desktop/Kryptos/Blockchain/consent-ledger/chaincode/consent-ledger \
  -ccl javascript
```

---

# Step 3 — Configure Environment Variables

```bash
export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}/../config

export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID=Org1MSP
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

export ORDERER_CA=${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/tls/ca.crt

export ORG1_PEER_TLS_CA=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export ORG2_PEER_TLS_CA=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
```

---

# Step 4 — Invoke Chaincode

### Create Consent Event

```bash
peer chaincode invoke \
  -o localhost:7050 \
  --ordererTLSHostnameOverride orderer.example.com \
  --tls --cafile $ORDERER_CA \
  -C consentchannel \
  -n consent-ledger \
  --peerAddresses localhost:7051 \
  --tlsRootCertFiles $ORG1_PEER_TLS_CA \
  --peerAddresses localhost:9051 \
  --tlsRootCertFiles $ORG2_PEER_TLS_CA \
  -c '{
    "function":"CreateConsentEvent",
    "Args":[
      "{\"eventId\":\"e100\",\"consentRequestId\":\"eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee\",\"statusIndicator\":\"accepted\",\"customerID\":\"999\",\"participantID\":\"BankX\",\"datetime\":\"2026-02-23T12:00:00Z\",\"communicationChannel\":\"mobile\",\"sharedKycHash\":\"ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff\"}"
    ]
  }'
```

---

# Step 5 — Query Chaincode

### Get Latest Consent

```bash
peer chaincode query \
  -C consentchannel \
  -n consent-ledger \
  -c '{"function":"GetLatestConsent","Args":["eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"]}'
```

---

# Summary

This setup performs the following:

1. Installs **Hyperledger Fabric binaries and Docker images**
2. Configures the **Fabric test network**
3. Starts a **2-organization Fabric network**
4. Creates the **`consentchannel` channel**
5. Deploys the **`consent-ledger` chaincode**
6. Invokes and queries the chaincode for **consent events**

---

# Request

### Post consent
url: http://localhost:4500/ledger/consents/events

```json
{
  "statusIndicator": "accepted",
  "customerID": "NID-1234",
  "participantID": "BANK-12",
  "datetime": "2026-02-17T12:34:56.789Z",
  "communicationChannel": "web",
  "sharedKYCPart": ""
}
```

Response:
```json
{
  "eventId": "6ee56982-f23a-4b5b-b17a-85e6d8a9f315",
  "consentRequestId": "57c0a6472e8c6dcbfefaa039e27341b567ecc9e8cee1670c1f1ef29ebfbf6b77",
  "txId": "70e0cd81f5021ab1cef4e9e6ce559f7827f833a32544de30d8ffe07aa8c451a9",
  "createdAt": "2026-02-26T10:53:08.000Z",
  "sharedKycHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
}
```


### Get Latest Consent
URL: http://localhost:4500/ledger/consents/{consentRequestId}/latest

Response:
```json
{
  "eventId": "39b29bcb-71bc-47be-bb99-060e7efa16d7",
  "consentRequestId": "57c0a6472e8c6dcbfefaa039e27341b567ecc9e8cee1670c1f1ef29ebfbf6b77",
  "statusIndicator": "revoked",
  "customerID": "NID-1234",
  "participantID": "BANK-12",
  "datetime": "2026-02-17T12:34:56.789Z",
  "communicationChannel": "web",
  "sharedKycHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "previousEventId": "6ee56982-f23a-4b5b-b17a-85e6d8a9f315",
  "createdAtTxId": "218ee4140f7be5280c416e217d537c9383d2a95851d812bbd69b83589fdbb451",
  "createdAt": "2026-02-26T10:53:47.000Z",
  "createdByMspId": "Org1MSP"
}
```


### Get Consents History
URL: http://localhost:4500/ledger/consents/{consentRequestId}/history

Response:
```json
[
  {
    "eventId": "2bf0450b-e277-413d-a08b-f1e62847d0d3",
    "consentRequestId": "f6e3d0ece078136702aed50703f0874c80991f952be62569da766d2ea2458f85",
    "statusIndicator": "revoked",
    "customerID": "NID-123",
    "participantID": "BANK-1",
    "datetime": "2026-02-17T12:34:56.789Z",
    "communicationChannel": "web",
    "sharedKycHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "previousEventId": "7d48aad6-84fc-47e1-a64d-e876620927dc",
    "createdAtTxId": "a177249852d31948996980c206f46948d9082cbb7ddc75b27c85a43982fb31dd",
    "createdAt": "2026-02-26T11:07:37.000Z",
    "createdByMspId": "Org1MSP"
  },
  {
    "eventId": "7d48aad6-84fc-47e1-a64d-e876620927dc",
    "consentRequestId": "f6e3d0ece078136702aed50703f0874c80991f952be62569da766d2ea2458f85",
    "statusIndicator": "accepted",
    "customerID": "NID-123",
    "participantID": "BANK-1",
    "datetime": "2026-02-17T12:34:56.789Z",
    "communicationChannel": "web",
    "sharedKycHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "createdAtTxId": "5aed1fed178bb8322f8beb547de0da85abd964e553521319a84f57ba84af9752",
    "createdAt": "2026-02-26T10:52:23.000Z",
    "createdByMspId": "Org1MSP"
  }
]
```
