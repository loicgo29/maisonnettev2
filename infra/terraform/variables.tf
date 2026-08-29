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
  # CX23 (x86) plutôt que CAX11 (ARM) : caractéristiques identiques — 2 vCPU,
  # 4 Go, 40 Go, 20 To — pour 5,49 € au lieu de 5,99 €, et disponible en stock
  # là où CAX11 et CPX11 étaient épuisés.
  # Prisma déclare déjà la cible linux-musl-openssl-3.0.x, les images se
  # construisent sur le serveur : l'architecture est sans conséquence ici.
  description = "Gabarit Hetzner. CX23 : 2 vCPU, 4 Go de RAM, 40 Go de disque, 5,49 €/mois."
  type        = string
  default     = "cx23"
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
