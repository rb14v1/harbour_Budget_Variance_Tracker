terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
  }
}

# ---------------------------------------------------------------------------
# Variables
# ---------------------------------------------------------------------------

variable "resource_group_name" {
  description = "Name of the Azure resource group that contains the Cosmos DB account."
  type        = string
}

variable "location" {
  description = "Primary Azure region for the Cosmos DB account."
  type        = string
}

variable "backup_storage_location" {
  description = "Secondary Azure region used for storing continuous backups (must differ from primary location)."
  type        = string

  validation {
    condition     = length(trimspace(var.backup_storage_location)) > 0
    error_message = "backup_storage_location must be set to a secondary Azure region different from location."
  }
}

check "backup_region_differs_from_primary" {
  assert {
    condition     = lower(replace(var.backup_storage_location, " ", "")) != lower(replace(var.location, " ", ""))
    error_message = "backup_storage_location must be a different Azure region from location so backups are stored cross-region."
  }
}

# ---------------------------------------------------------------------------
# Cosmos DB account — MongoDB API, continuous backup, 30-day PITR
# ---------------------------------------------------------------------------

resource "azurerm_cosmosdb_account" "mongo" {
  name                = "cosmosmongo-bud-variance-har"
  resource_group_name = var.resource_group_name
  location            = var.location
  offer_type          = "Standard"
  kind                = "MongoDB"

  # Continuous backup enables point-in-time recovery (PITR).
  # tier = "Continuous30Days" satisfies the ≥30-day retention requirement.
  # NOTE: `storage_redundancy` is only valid for Periodic backups in azurerm;
  # with Continuous backup, Azure stores backups in every region the account
  # is replicated to, so cross-region backup storage comes from the second
  # geo_location below.
  backup {
    type = "Continuous"
    tier = "Continuous30Days"
  }

  # The secondary geo_location means continuous backups are also stored in a
  # separate region from the primary database.
  geo_location {
    location          = var.location
    failover_priority = 0
  }

  geo_location {
    location          = var.backup_storage_location
    failover_priority = 1
  }

  consistency_policy {
    consistency_level = "Session"
  }

  capabilities {
    name = "EnableMongo"
  }

  capabilities {
    name = "mongoEnableDocLevelTTL"
  }
}

# ---------------------------------------------------------------------------
# Outputs
# ---------------------------------------------------------------------------

output "cosmosdb_account_id" {
  description = "Resource ID of the Cosmos DB account."
  value       = azurerm_cosmosdb_account.mongo.id
}

output "cosmosdb_connection_strings" {
  description = "Connection strings for the Cosmos DB account (sensitive)."
  value       = azurerm_cosmosdb_account.mongo.connection_strings
  sensitive   = true
}
