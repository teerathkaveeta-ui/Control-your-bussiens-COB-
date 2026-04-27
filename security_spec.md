# Control Your Business Security Specification

## Data Invariants
1. A transaction must belong to a valid business ID.
2. Only the owner of a business can read or write its transactions, customers, and memories.
3. Transaction amounts must be non-negative.
4. Timestamps must be handled by the server (request.time).
5. Customer debt can only be modified if the user is authenticated.

## The Dirty Dozen Payloads

1. **Identity Spoofing**: Creating a transaction with a different `businessId` in the data than the path.
2. **Unauthorized Read**: Attempting to list transactions of another business.
3. **Invalid Amount**: Setting a transaction amount to a negative number.
4. **Invalid Type**: Setting transaction type to "bonus" (not in enum).
5. **Path Poisoning**: Using a 2KB string as a `transactionId`.
6. **Timestamp Spoofing**: Providing a client-side `createdAt` date from 2001.
7. **Phantom Field**: Adding `isVerified: true` to a customer record.
8. **Memory Manipulation**: Deleting a business memory from last month as a non-admin.
9. **Debt Overwrite**: Resetting a customer's `totalDebt` to 0 without a corresponding transaction.
10. **Unauthenticated Write**: Trying to create a customer without being logged in.
11. **Resource Exhaustion**: Sending a description string that is 1MB in size.
12. **Cross-Business Access**: Trying to link a transaction in Business A to a customer in Business B.

## The Test Runner (Mock)
A complete `firestore.rules.test.ts` would verify these. Specifically:
- `db.collection('businesses/B1/transactions').add({...})` should fail if auth.uid != owner of B1.
- `db.doc('businesses/B1/customers/C1').update({isVerified: true})` should fail due to strictly defined schema.
