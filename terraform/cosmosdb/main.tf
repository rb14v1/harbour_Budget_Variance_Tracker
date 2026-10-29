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
  backup {
    type                = "Continuous"
    tier                = "Continuous30Days"
    storage_redundancy  = "Geo"          # backup data is geo-redundant (cross-region)
  }

  # Geo-redundancy ensures the backup copy lives in a separate region.
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
