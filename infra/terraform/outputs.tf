output "ipv4" {
  description = "Adresse IPv4 publique — c'est elle qu'attend l'enregistrement DNS A."
  value       = hcloud_server.app.ipv4_address
}

output "ipv6" {
  description = "Adresse IPv6 publique, pour l'enregistrement AAAA."
  value       = hcloud_server.app.ipv6_address
}

output "ssh" {
  description = "Commande de connexion."
  value       = "ssh ${var.utilisateur_deploiement}@${hcloud_server.app.ipv4_address}"
}

output "dns_a_faire" {
  description = "Enregistrements DNS à créer chez Cloudflare une fois le serveur en place."
  value       = <<-EOT
    A     maisonnette-pecheur-bertheaume.fr      → ${hcloud_server.app.ipv4_address}
    A     www.maisonnette-pecheur-bertheaume.fr  → ${hcloud_server.app.ipv4_address}
    AAAA  maisonnette-pecheur-bertheaume.fr      → ${hcloud_server.app.ipv6_address}

    Retirer au préalable l'ingress du tunnel Cloudflare pour ce domaine
    (~/.cloudflared/config.yml), sinon les deux se disputent le trafic.
  EOT
}

output "cout_mensuel_estime" {
  description = "Estimation, hors trafic sortant (20 To inclus)."
  value       = "~6,93 €/mois : CAX11 5,99 € + IPv4 0,50 € + volume ${var.taille_volume_go} Go 0,44 €"
}
