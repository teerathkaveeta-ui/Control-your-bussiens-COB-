# Security Specification for COB (Control Your Business)

## Data Invariants
1. A transaction must belong to a business.
2. Only the authenticated user (business owner) can read or write data for their own `businessId`.
3. `businessId` in paths must match `request.auth.uid`.
4. Transactions must have a valid `type` and non-negative `amount` (mostly, debt/payment might be specific but usually positive amounts recorded).
5. `totalDebt` should correctly reflect the balance (though client handles sync, rules should prevent random updates).

## The "Dirty Dozen" Payloads (Testing Denials)
1. **Identity Spoofing**: Attempt to create a transaction in another user's `businessId` folder. (Expect: PERMISSION_DENIED)
2. **Path Poisoning**: Attempt to use a very long string as `transactionId`. (Expect: PERMISSION_DENIED)
3. **Ghost Field Injection**: Add `isVerified: true` to a transaction. (Expect: PERMISSION_DENIED)
4. **Type Confusion**: Send `amount: "100"` as string. (Expect: PERMISSION_DENIED)
5. **Unauthorized Read**: Try to list all transactions across all businesses. (Expect: PERMISSION_DENIED)
6. **Immutable Field Change**: Try to update `timestamp` on an existing transaction. (Expect: PERMISSION_DENIED)
7. **Negative Amount**: Try to record a transaction with `amount: -500`. (Expect: PERMISSION_DENIED)
8. **Unauthenticated Write**: Try to write data without being logged in. (Expect: PERMISSION_DENIED)
9. **Email Spoofing (if applicable)**: Try to access admin paths with unverified email. (N/A here as no admin role used yet, but good practice).
10. **Shadow Update**: Try to change `customerName` on a transaction record after creation. (Expect: PERMISSION_DENIED if immutable).
11. **Resource Exhaustion**: Send a massive string in `description`. (Expect: PERMISSION_DENIED)
12. **Status Bypass**: Directly update a customer's `totalDebt` to `0` without a payment record (though our logic allows updates, we should limit who can do what).

## Test Runner (Draft)
I will implement `firestore.rules` and then verify.
