# PREPSKM.IN Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Default Deny**: Any unmatched path in Firestore is denied for both reads and writes.
2. **Admin Authorization**: Only verified accounts matching `admins/{uid}` OR verified email `saurav586kumar@gmail.com` (and runtime owner `rahuldhi638@gmail.com`) with `request.auth.token.email_verified == true` may mutate subjects, chapters, sections, materials, lectures, mockTests, questions, or platformSettings.
3. **PII Isolation**: `users/{userId}` and `userProgress/{userId}` contain private student data and can only be read/written by `isOwner(userId)` or `isAdmin()`.
4. **No Privilege Escalation**: A student creating or updating their own `users/{userId}` document can NEVER set `role: 'admin'`.
5. **Published Content Visibility**: Students and guests can only read `mockTests` where `status == 'published'` (admins can read drafts).
6. **Immutable Test Attempts**: `testAttempts/{attemptId}` records belong strictly to `userId == request.auth.uid`, enforce `userId` matching on `list` queries, and cannot be updated or deleted by students (preserving full cumulative test history).

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unverified Admin Email Spoof**: `{ email: "saurav586kumar@gmail.com", email_verified: false }` attempting to write `/subjects/phy` -> **PERMISSION_DENIED**.
2. **Self-Assigned Admin Escalation**: Student creating `/users/{uid}` with `{ role: "admin" }` -> **PERMISSION_DENIED**.
3. **Role Tampering on Update**: Student updating `/users/{uid}` changing `role` from `"student"` to `"admin"` -> **PERMISSION_DENIED**.
4. **PII Cross-User Read**: Student A reading `/users/{studentB}` -> **PERMISSION_DENIED**.
5. **Draft Test Leak**: Non-admin reading `/mockTests/{draftId}` where `status == "draft"` -> **PERMISSION_DENIED**.
6. **Student Writing Question Paper**: Student creating or editing `/questions/{qId}` -> **PERMISSION_DENIED**.
7. **Shadow Field Injection**: Student writing `/users/{uid}` with extra field `isProMember: true` -> **PERMISSION_DENIED** (rejected by `keys().hasOnly()`).
8. **Attempt Forgery for Another User**: Student A creating `/testAttempts/{id}` with `userId: studentB` -> **PERMISSION_DENIED**.
9. **Attempt History Overwrite**: Student updating an existing `/testAttempts/{id}` to boost `score` -> **PERMISSION_DENIED**.
10. **Blanket Attempt Scraping**: Student listing `/testAttempts` without `where('userId', '==', uid)` -> **PERMISSION_DENIED** (rule checks `resource.data.userId == request.auth.uid`).
11. **Oversized ID Poisoning**: Creating `/subjects/{1500_char_id}` -> **PERMISSION_DENIED** (`isValidId()` rejects > 128 chars).
12. **Client Timestamp Tampering**: Creating `/testAttempts/{id}` with forged future `submittedAt` not matching `request.time` -> **PERMISSION_DENIED**.
