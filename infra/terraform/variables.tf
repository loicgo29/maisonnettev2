variable "hcloud_token" {
  description = "Jeton API Hetzner Cloud. Jamais en dur : il vient de Bitwarden via TF_VAR_hcloud_token (voir README.md)."
  type        = string
  sensitive   = true
}

variable "cle_ssh_publique" {
  description = "Contenu de la clé publique SSH autorisée sur le serveur (ex. ~/.ssh/id_ed25519.pub)."
  type        = string
}

variable "nom_projet" {
  description = "Préfixe des ressources créées."
  type        = string
  default     = "maisonnettev2"
}

variable "type_serveur" {
  # CAX11 (ARM Ampere) plutôt que CPX12 (x86) : deux fois plus de vCPU et de
  # RAM pour moitié prix. L'ARM64 est aussi l'architecture du Mac mini, donc
  # les images se construisent à l'identique — Prisma déclare déjà la cible
  # linux-musl-arm64-openssl-3.0.x, et postgres/node/caddy sont multi-arch.
  description = "Gabarit Hetzner. CAX11 : 2 vCPU ARM, 4 Go de RAM, 40 Go de disque, 5,99 €/mois."
  type        = string
  default     = "cax11"
}

variable "localisation" {
  description = "Centre de données. Hetzner n'en a pas en France ; fsn1 (Falkenstein) est le plus proche."
  type        = string
  default     = "fsn1"
}

variable "taille_volume_go" {
  description = "Volume des données PostgreSQL, en Go. 10 Go est le minimum facturable (~0,44 €/mois) et couvre très largement le volume actuel."
  type        = number
  default     = 10
}

variable "utilisateur_deploiement" {
  description = "Compte non-root créé sur le serveur pour le déploiement."
  type        = string
  default     = "deploy"
}

variable "ips_ssh_autorisees" {
  description = "IP autorisées à ouvrir une session SSH. À resserrer sur ton IP de sortie une fois celle-ci stable."
  type        = list(string)
  default     = ["0.0.0.0/0", "::/0"]
}
