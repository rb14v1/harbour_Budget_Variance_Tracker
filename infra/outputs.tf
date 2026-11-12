
output "cosmos_mongo_connection" {
  value     = azurerm_cosmosdb_account.cosmos_mongo.primary_mongodb_connection_string
  sensitive = true
}

output "blob_storage_connection" {
  value     = azurerm_storage_account.blob.primary_connection_string
  sensitive = true
}
output "blob_storage_account_id" {
  value = azurerm_storage_account.blob.id
}