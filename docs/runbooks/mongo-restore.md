# Restore Procedure — Cosmos DB (MongoDB API) `cosmosmongo-bud-variance-har`

> **Audience:** On-call engineers and release leads  
> **Last tested:** Before initial go-live (required); repeat after every major schema migration.

---

## Overview

The Cosmos DB account `cosmosmongo-bud-variance-har` is configured with **Continuous 30-Day backup** (PITR). Backups are stored in a geo-redundant secondary region (separate from the primary region) and are managed automatically by Azure — no manual snapshot jobs are needed.

Point-in-time recovery lets you restore the entire account, or a single database/collection, to any second within the last **30 days**.

---

## Prerequisites

| Requirement | Details |
|---|---|
| Azure CLI | `az` ≥ 2.50 installed and authenticated (`az login`) |
| Subscription access | Contributor or Cosmos DB Operator on the resource group |
| Target resource group | A **different** resource group (or at minimum a different account name) from the live account — restores always create a *new* account |

---

## 1 — Identify the restore point

```bash
# List the earliest/latest timestamps available for PITR
az cosmosdb restorable-database-account list \
  --location <primary-region> \
  --query "[?name=='cosmosmongo-bud-variance-har']"
```

Note the `creationTime` and `deletionTime` (if applicable). Your restore timestamp must fall within the backup window.

---

## 2 — Restore the account (full account restore)

```bash
RESTORE_TIMESTAMP="2026-10-28T14:00:00Z"   # ISO-8601, UTC — adjust as needed
SOURCE_ACCOUNT_ID="<instanceId from step 1>"
TARGET_RG="<resource-group-for-restored-account>"
TARGET_LOCATION="<primary-region>"

az cosmosdb restore \
  --target-database-account-name cosmosmongo-bud-variance-har-restored \
  --account-name cosmosmongo-bud-variance-har \
  --restore-timestamp "${RESTORE_TIMESTAMP}" \
  --location "${TARGET_LOCATION}" \
  --resource-group "${TARGET_RG}"
```

The restore typically completes in **15–60 minutes** depending on data size.

---

## 3 — Restore a single database or collection (selective restore)

```bash
az cosmosdb restore \
  --target-database-account-name cosmosmongo-bud-variance-har-restored \
  --account-name cosmosmongo-bud-variance-har \
  --restore-timestamp "${RESTORE_TIMESTAMP}" \
  --location "${TARGET_LOCATION}" \
  --resource-group "${TARGET_RG}" \
  --databases-to-restore name=<db-name> collections=<collection-name>
```

---

## 4 — Validate the restored data

1. Connect to the restored account using the connection string from:
   ```bash
   az cosmosdb keys list \
     --name cosmosmongo-bud-variance-har-restored \
     --resource-group "${TARGET_RG}" \
     --type connection-strings
   ```
2. Spot-check document counts and spot-sample records against known-good values.
3. Run the application's integration test suite against the restored endpoint.

---

## 5 — Promote the restored account (if replacing production)

1. Update the application connection string (environment variable / Key Vault secret) to point to the restored account.
2. Restart the application pods/containers.
3. Monitor error rates and latency for at least 15 minutes.
4. Once stable, delete or archive the old account.

---

## 6 — Post-incident actions

- [ ] Record the incident in the runbook log table below.
- [ ] Confirm PITR is still active on the new account (`az cosmosdb show ... | jq .backupPolicy`).
- [ ] Update this document if the procedure changed.

---

## Restore test log

| Date | Tester | Restore timestamp used | Result | Notes |
|------|--------|------------------------|--------|-------|
| _(pre-go-live test required)_ | | | | |
