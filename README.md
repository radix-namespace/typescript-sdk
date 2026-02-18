# Radix Namespace SDK

> A TypeScript SDK for the [Radix Namespace](https://github.com/radix-namespace) — a decentralized naming system on the Radix Network.

[![Jest E2E](https://github.com/radix-namespace/typescript-sdk/actions/workflows/run-e2e-tests.yml/badge.svg?branch=main)](https://github.com/radix-namespace/typescript-sdk/actions/workflows/run-e2e-tests.yml)

**This is a community-owned, forkable project.** The Radix Namespace is a public good — both the on-ledger smart contracts and the tooling around them are designed to be forked, extended, and improved by the community. This repository is published as an immutable reference implementation. There is no upstream to push fixes to; if you want to improve it, fork it and make it yours.

---

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Core Concepts](#core-concepts)
- [API Reference](#api-reference)
  - [Domain Queries](#domain-queries)
  - [Domain Transactions](#domain-transactions)
  - [Record Management](#record-management)
  - [Subdomains](#subdomains)
  - [Account Settings & Reverse Resolution](#account-settings--reverse-resolution)
  - [Registrar System](#registrar-system)
  - [Subregistry Management](#subregistry-management)
  - [Utility Methods](#utility-methods)
- [Type Exports](#type-exports)
- [Importing Accepted Domains](#importing-accepted-domains)
- [Compatibility](#compatibility)
- [Forking & Community Development](#forking--community-development)

---

## Installation

```bash
npm install @radixnamespace/typescript-sdk
```

**Peer Dependencies:**
- `@radixdlt/radix-dapp-toolkit` (required for transactions)
- `decimal.js` (for precise decimal arithmetic)

---

## Quick Start

### Read-Only Operations (No Wallet Required)

```typescript
import NamespaceSDK from '@radixnamespace/typescript-sdk';

// Initialize for read-only operations
const namespace = new NamespaceSDK({ network: 'mainnet' });

// Check domain availability
const status = await namespace.getDomainStatus({ domain: 'alice.xrd' });
if (status.data?.status === 'available') {
  console.log('Domain is available!');
}

// Get domain details
const details = await namespace.getDomainDetails({ domain: 'alice.xrd' });
console.log(details.data?.current_activated_owner);

// Resolve a record
const record = await namespace.resolveRecord({
  domain: 'alice.xrd',
  docket: { context: 'receivers', directive: 'xrd' }
});
console.log(record.data?.value); // The XRD address
```

### Full Operations (With Wallet)

```typescript
import NamespaceSDK from '@radixnamespace/typescript-sdk';
import { RadixDappToolkit } from '@radixdlt/radix-dapp-toolkit';

// Initialize with Radix Dapp Toolkit
const rdt = RadixDappToolkit({ /* your config */ });
const namespace = new NamespaceSDK({ 
  network: 'mainnet',
  rdt 
});

// Register a domain
const result = await namespace.registerDomain({
  domain: 'alice.xrd',
  accountAddress: 'account_rdx...',
  registrarId: '1' // Choose a registrar
});

if (result.feedback) {
  console.log('Domain registered!');
}
```

---

## Core Concepts

### Architecture

The Radix Namespace is composed of several key concepts:

#### Domains & Bonds
- **Domains** are represented as NFTs on the Radix ledger
- **Bonds** are USD-stable payments required to register/hold a domain (refundable on unbond)
- Bond amounts are determined by domain length (shorter = higher bond)

#### Subregistries
- Each domain has a **Subregistry Component** for storing records and subdomains
- Subregistries are dedicated on-ledger components that hold all domain data
- Records use a `context:directive` format (e.g., `social:twitter`, `receivers:xrd`)

#### Registrars
- **Registrars** are domain service providers that facilitate registration
- Registrars earn fees (percentage of bond) for domains registered through them
- Anyone can become a registrar by registering with the namespace component

#### Primary Domain & Discovery
- Accounts can set a **Primary Domain** for reverse resolution
- **Discovery** is an opt-in setting that allows third parties to resolve your domain
- Privacy-first: discovery defaults to `false`

---

## API Reference

### Domain Queries

#### `getDomainStatus`
Check if a domain is available, taken, or invalid.

```typescript
const status = await namespace.getDomainStatus({ domain: 'example.xrd' });

// status.data.status: 'available' | 'taken'
// status.data.domain: 'example.xrd'
// status.data.required_bond_units: Bond amount required
```

#### `getDomainDetails`
Get comprehensive details for a registered domain or subdomain.

```typescript
const details = await namespace.getDomainDetails({ domain: 'example.xrd' });

// details.data.name: 'example.xrd'
// details.data.id: Domain NFT ID
// details.data.current_activated_owner: Owner account address
// details.data.subregistry_component_address: Subregistry address
// details.data.records_kvs_address: Records KeyValueStore address
```

#### `getAccountDomains`
Get all domains owned by an account with pagination.

```typescript
const domains = await namespace.getAccountDomains({
  accountAddress: 'account_rdx...',
  pagination: { page: 1 }
});

// domains.data.domains: DomainDataI[]
// domains.data.pagination: { total_count, next_page, ... }
```

#### `getSubdomains`
Get all subdomains for a parent domain.

```typescript
const subdomains = await namespace.getSubdomains({
  domain: 'example.xrd',
  pagination: { page: 1 }
});

// subdomains.data.subdomains: SubDomainDataI[]
// subdomains.data.pagination: { total_count, ... }
```

#### `getRecords`
Get all records for a domain with pagination.

```typescript
const records = await namespace.getRecords({
  domain: 'example.xrd',
  pagination: { page: 1 }
});

// records.data.records: RecordItemI[]
// records.data.pagination: { total_count, ... }
```

#### `resolveRecord`
Resolve a specific record by context and directive.

```typescript
const record = await namespace.resolveRecord({
  domain: 'example.xrd',
  docket: { context: 'receivers', directive: 'xrd' }
});

// record.data.value: The record value
```

#### `checkAuthenticity`
Verify a domain is actually owned by the claimed account.

```typescript
const check = await namespace.checkAuthenticity({
  domain: 'example.xrd',
  accountAddress: 'account_rdx...'
});

// check.data.isAuthentic: boolean
```

---

### Domain Transactions

#### `registerDomain`
Register a new domain through a registrar.

```typescript
const result = await namespace.registerDomain({
  domain: 'example.xrd',
  accountAddress: 'account_rdx...',
  registrarId: '1',
  paymentResource: 'resource_rdx...', // Optional: defaults to first accepted
  callbacks: {
    onTransactionId: (txId) => console.log('TX:', txId),
    onSuccess: () => console.log('Success!'),
    onFail: (error) => console.error('Failed:', error)
  }
});
```

#### `activateDomain`
Activate a domain to enable record management.

```typescript
const result = await namespace.activateDomain({
  domain: 'example.xrd',
  accountAddress: 'account_rdx...'
});
```

#### `transferDomain`
Transfer a domain to another account.

```typescript
const result = await namespace.transferDomain({
  domain: 'example.xrd',
  fromAddress: 'account_rdx...',
  destinationAddress: 'account_rdx...',
  preferences: {
    deactivateBeforeTransfer: true, // Deactivate first
    clearRecords: true // Clear all records
  }
});
```

#### `unbondDomain`
Return a domain and reclaim your bond.

```typescript
const result = await namespace.unbondDomain({
  domain: 'example.xrd',
  accountAddress: 'account_rdx...',
  preserveSubregistryData: false // true to keep records/subdomains
});
```

#### `getAccountImportDomains`
Discover accepted import domains owned by an account.

```typescript
const imports = await namespace.getAccountImportDomains({
  accountAddress: 'account_rdx...',
  pagination: { page: 1 }
});

// imports.data.domains: ImportDomainI[]
// imports.data.pagination: { total_count, ... }

for (const domain of imports.data.domains) {
  console.log(`${domain.name} - created: ${new Date(domain.created_timestamp)}`);
}
```

#### `importAcceptedDomain`
Import an accepted domain into the Radix Namespace.

```typescript
const result = await namespace.importAcceptedDomain({
  domain: 'example.xrd',
  accountAddress: 'account_rdx...',
  paymentResource: 'resource_rdx...' // Optional
});
```

#### `rebondDomain`
Swap your domain's bond to a different accepted payment resource without losing the domain.

```typescript
const result = await namespace.rebondDomain({
  domain: 'example.xrd',
  accountAddress: 'account_rdx...',
  newPaymentResource: 'resource_rdx...' // Must be an accepted resource
});

// Old bond is returned to your account
// Domain continues with new bond resource
```

---

### Record Management

#### `createRecord`
Create a single record.

```typescript
const result = await namespace.createRecord({
  domain: 'example.xrd',
  accountAddress: 'account_rdx...',
  docket: {
    context: 'social',
    directive: 'twitter',
    value: '@example'
  }
});
```

#### `createRecords` (Batch)
Create multiple records in a single transaction.

```typescript
const result = await namespace.createRecords({
  domain: 'example.xrd',
  accountAddress: 'account_rdx...',
  records: [
    { context: 'social', directive: 'twitter', value: '@example' },
    { context: 'social', directive: 'github', value: 'example' },
    { context: 'receivers', directive: 'xrd', value: 'account_rdx...' }
  ]
});
```

#### `amendRecord`
Update an existing record.

```typescript
const result = await namespace.amendRecord({
  domain: 'example.xrd',
  accountAddress: 'account_rdx...',
  docket: {
    context: 'social',
    directive: 'twitter',
    value: '@newhandle'
  }
});
```

#### `deleteRecord`
Delete a record by context and directive.

```typescript
const result = await namespace.deleteRecord({
  domain: 'example.xrd',
  accountAddress: 'account_rdx...',
  docket: { context: 'social', directive: 'twitter' }
});
```

#### `deleteRecordById`
Delete a record by its ID.

```typescript
const result = await namespace.deleteRecordById({
  domain: 'example.xrd',
  accountAddress: 'account_rdx...',
  recordId: '<record-id>'
});
```

#### `deleteRecords` (Batch)
Delete multiple records in a single transaction.

```typescript
const result = await namespace.deleteRecords({
  domain: 'example.xrd',
  accountAddress: 'account_rdx...',
  records: [
    { context: 'social', directive: 'twitter' },
    { context: 'social', directive: 'github' }
  ]
});
```

#### `deleteContextRecords`
Delete all records in a specific context.

```typescript
const result = await namespace.deleteContextRecords({
  domain: 'example.xrd',
  accountAddress: 'account_rdx...',
  context: 'social' // Deletes ALL social records
});
```

---

### Subdomains

#### `createSubdomain`
Create a subdomain under a root domain.

```typescript
const result = await namespace.createSubdomain({
  subdomain: 'blog.example.xrd',
  accountAddress: 'account_rdx...'
});
```

#### `deleteSubdomain`
Delete a subdomain.

```typescript
const result = await namespace.deleteSubdomain({
  subdomain: 'blog.example.xrd',
  accountAddress: 'account_rdx...'
});
```

---

### Account Settings & Reverse Resolution

#### `updateAccountSettings`
Set primary domain and/or discovery settings.

```typescript
// Set primary domain (discovery off by default - privacy first)
const result = await namespace.updateAccountSettings({
  accountAddress: 'account_rdx...',
  primaryDomain: 'example.xrd'
});

// Set primary domain WITH discovery enabled
const result = await namespace.updateAccountSettings({
  accountAddress: 'account_rdx...',
  primaryDomain: 'example.xrd',
  enableDiscovery: true
});

// Use a subdomain as primary
const result = await namespace.updateAccountSettings({
  accountAddress: 'account_rdx...',
  primaryDomain: 'blog.example.xrd'
});

// Toggle discovery only (requires existing primary)
const result = await namespace.updateAccountSettings({
  accountAddress: 'account_rdx...',
  enableDiscovery: true
});
```

#### `getAccountSettings`
Get an account's Namespace configuration (for account owners).

```typescript
const settings = await namespace.getAccountSettings({
  accountAddress: 'account_rdx...'
});

// settings.data.primaryDomain: 'example.xrd'
// settings.data.discoveryEnabled: boolean
// settings.data.isAuthentic: boolean (domain still owned)
```

#### `resolveAccountDomain`
Reverse resolution for third parties (respects privacy settings).

```typescript
const domain = await namespace.resolveAccountDomain({
  accountAddress: 'account_rdx...'
});

// domain.data: 'example.xrd' (if discoverable) or null
```

---

### Registrar System

#### `registerAsRegistrar`
Become a domain service provider.

```typescript
import Decimal from 'decimal.js';

const result = await namespace.registerAsRegistrar({
  name: 'My Domain Service',
  iconUrl: 'https://example.com/logo.png',
  websiteUrl: 'https://example.com',
  feePercentage: new Decimal(2.5), // 2.5% fee
  accountAddress: 'account_rdx...'
});
```

#### `getAllRegistrars`
List all registered registrars.

```typescript
const registrars = await namespace.getAllRegistrars({
  pagination: { page: 1 }
});

// registrars.data.registrar_ids: string[]
```

#### `getRegistrarDetails`
Get metadata for a specific registrar.

```typescript
const details = await namespace.getRegistrarDetails({
  registrarId: '1'
});

// details.data.name: 'My Domain Service'
// details.data.fee_percentage: '2.5'
// details.data.icon_url: 'https://...'
// details.data.website_url: 'https://...'
```

#### `getRegistrarStats`
Get performance statistics for a registrar.

```typescript
const stats = await namespace.getRegistrarStats({
  registrarId: '1'
});

// stats.data.domains_bonded: { 'resource_...': 15 } - Active domains per resource
// stats.data.domains_bonded_cumulative: 25 - Lifetime total domains
// stats.data.fees_earned_cumulative: { 'resource_...': '150.50' } - Lifetime fees
// stats.data.fees_earned_current: { 'resource_...': '45.50' } - Available to withdraw
// stats.data.last_withdrawal: 1704067200 - Unix timestamp or null
```

#### `updateRegistrar`
Update registrar metadata (requires badge ownership).

```typescript
const result = await namespace.updateRegistrar({
  registrarId: '1',
  accountAddress: 'account_rdx...',
  feePercentage: new Decimal(3) // Update fee only
});
```

#### `getRegistrarFeeBalances`
Check accumulated fees across all payment resources.

```typescript
const fees = await namespace.getRegistrarFeeBalances({
  registrarId: '1'
});

// fees.data.fees: [{ resource: {...}, amount: '10.5' }]
```

#### `withdrawRegistrarFees`
Withdraw accumulated fees (auto-discovers all resources).

```typescript
const result = await namespace.withdrawRegistrarFees({
  registrarId: '1',
  accountAddress: 'account_rdx...',
  resourceAddress: 'resource_rdx...' // Optional: specific resource only
});
```

#### `burnRegistrarBadge`
Permanently destroy registrar badge.

```typescript
// ⚠️ Withdraw all fees FIRST - unwithdrawn fees are lost forever!
const result = await namespace.burnRegistrarBadge({
  registrarId: '1',
  accountAddress: 'account_rdx...'
});
```

---

### Subregistry Management

#### `updateSubregistryIcon`
Update your domain's subregistry icon.

```typescript
const result = await namespace.updateSubregistryIcon({
  domain: 'example.xrd',
  iconUrl: 'https://example.com/icon.png',
  accountAddress: 'account_rdx...'
});
```

#### `updateSubregistryDappDefinition`
Link subregistry to a dApp definition.

```typescript
const result = await namespace.updateSubregistryDappDefinition({
  domain: 'example.xrd',
  dappDefinitionAddress: 'account_dapp_def...',
  accountAddress: 'account_rdx...'
});
```

#### `replaceSubregistry`
Replace subregistry with a fresh one (destroys all records/subdomains).

```typescript
// ⚠️ IRREVERSIBLE - all existing data is lost!
const result = await namespace.replaceSubregistry({
  domain: 'example.xrd',
  accountAddress: 'account_rdx...'
});
```

---

### Utility Methods

Access via `namespace.utils.*`:

#### Domain Validation

```typescript
// Validate a root domain
const result = namespace.utils.validateDomain({ domain: 'example.xrd' });
// result.isValid: boolean
// result.errors: [{code, error, verbose}]

// Validate a subdomain
const result = namespace.utils.validateSubdomain({ subdomain: 'blog.example.xrd' });

// Validate account address
const result = namespace.utils.validateAccountAddress({ accountAddress: 'account_rdx...' });
```

#### Domain Type Checking

```typescript
// Check if subdomain
namespace.utils.isSubdomain('blog.example.xrd'); // true
namespace.utils.isSubdomain('example.xrd'); // false

// Check if root domain
namespace.utils.isRootDomain('example.xrd'); // true

// Get root from subdomain
namespace.utils.getRootFromSubdomain({ subdomain: 'blog.example.xrd' }); // 'example.xrd'
```

#### Cost Calculation

```typescript
// Get detailed cost breakdown
const costs = await namespace.utils.getCostBreakdown({
  domain: 'example.xrd',
  registrarId: '1'
});

// costs.data.bondAmount: '4' (USD)
// costs.data.registrarFee: '0.1' (2.5% of bond)
// costs.data.totalAmount: '4.1' (USD)
// costs.data.paymentResource: 'resource_rdx...'
```

#### Balance Checking

```typescript
// Get accepted payment tokens
const tokens = await namespace.utils.getAcceptedBondTokens();
// tokens.data: [{address, name, symbol, ...}]

// Get account balances for accepted tokens
const balances = await namespace.utils.getAccountBondBalances({
  accountAddress: 'account_rdx...'
});
// balances.data.balances: [{resourceAddress, balance, resourceName, ...}]

// Check if account can afford registration
const check = await namespace.utils.checkAccountBondAffordability({
  accountAddress: 'account_rdx...',
  requiredAmount: '4.1'
});
// check.data.sufficientBalances: tokens with enough balance
// check.data.insufficientBalances: tokens with shortfall amounts
```

---

## Type Exports

The SDK exports comprehensive TypeScript types for full type safety:

```typescript
import type {
  // Domain Types
  DomainDataI,
  SubDomainDataI,
  PaginatedDomainsResponseI,
  PaginatedSubdomainsResponseI,
  DomainStatusT,
  DomainStatusInfoI,
  
  // Import Domain Types
  ImportDomainI,
  PaginatedImportDomainsI,
  
  // Record Types
  RecordItemI,
  RecordDocketI,
  RecordEntryI,
  RecordRefI,
  PaginatedRecordsResponseI,
  ContextT,
  
  // Response Types
  SdkResponseT,
  SdkTransactionResponseT,
  ErrorI,
  ErrorStackI,
  TransactionFeedbackStackI,
  RegistrationCostBreakdownI,
  
  // Registrar Types
  RegistrarDetailsI,
  RegistrarStatsI,
  PaginatedRegistrarsResponseI,
  PaginatedRegistrarFeesI,
  
  // Balance Types
  AccountBondBalancesResultI,
  BondAffordabilityResultI,
  ResourceDetailsI,
  
  // Transaction Types
  EventCallbacksI,
  TransferPreferencesI,
  
  // Pagination Types
  PaginationParamsI,
  PaginationInfoI,
  
  // Entity Types
  EntitiesT,
  NetworkT
} from '@radixnamespace/typescript-sdk';
```

---

## Importing Accepted Domains

### For Domain Owners

If you have accepted import domains, import them into the Radix Namespace to access all features.

#### Step 1: Discover Import Domains

```typescript
const imports = await namespace.getAccountImportDomains({
  accountAddress: 'account_rdx...'
});

console.log(`Found ${imports.data.domains.length} domains to import`);
```

#### Step 2: Check Import Costs

```typescript
for (const domain of imports.data.domains) {
  const costs = await namespace.utils.getCostBreakdown({
    domain: domain.name,
    registrarId: null  // No registrar fees for imports
  });
  console.log(`${domain.name}: ${costs.data.bondAmount} bond required`);
}
```

#### Step 3: Import Each Domain

```typescript
for (const domain of imports.data.domains) {
  const result = await namespace.importAcceptedDomain({
    domain: domain.name,
    accountAddress: 'account_rdx...'
  });
  
  if (result.feedback) {
    console.log(`Imported ${domain.name}`);
  }
}
```

**What happens during import:**
1. Your import domain NFT proof is verified by the Radix Namespace component
2. A new domain NFT is issued to your account
3. A dedicated subregistry component is created for records/subdomains
4. You pay only the bond amount (no registrar fees)

### Claiming from the Account Locker

If the direct deposit was rejected (e.g., due to account deposit rules), the domain NFT is stored in the Radix Namespace AccountLocker. You can claim it:

```typescript
// Claim all stored domain NFTs
const result = await namespace.claimFromLocker({
  accountAddress: 'account_rdx...'
});

// Or claim specific NFTs by ID
const result = await namespace.claimFromLocker({
  accountAddress: 'account_rdx...',
  nftIds: ['#1#', '#2#']
});
```

---

## Compatibility

- **Browsers**: All modern browsers (ES2020+)
- **Node.js**: v18 and above
- **Radix Network**: Mainnet & Stokenet

---

## Forking & Community Development

This SDK is published as an **immutable reference implementation**. The Radix Namespace project believes that decentralized protocols deserve decentralized tooling - the community should own and evolve not just the protocol, but everything built around it.

### How to Fork

1. **Fork** this repository on GitHub

2. **Clone** your fork:

```bash
git clone https://github.com/your-username/typescript-sdk.git
cd typescript-sdk
npm install
```

3. **Run the test suite** to verify everything works:

```bash
npm test
```

4. **Make it yours** — fix bugs, add features, improve the DX, publish your own package

### No Pull Requests

This repository does not accept pull requests. It is a sealed reference point. If you build something better - the community will find it. The best version of this SDK is the one the community decides to use.

---

## License

MIT

---
