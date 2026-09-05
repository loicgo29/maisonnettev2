terraform {
  required_version = ">= 1.5"

  required_providers {
    hcloud = {
      source  = "hetznercloud/hcloud"
      version = "~> 1.49"
    }
  }
}

provider "hcloud" {
  token = var.hcloud_token
}

# Clé SSH — le mot de passe est désactivé sur le serveur (voir cloud-init),
# cette clé est donc le seul moyen d'accès.
resource "hcloud_ssh_key" "principale" {
  name       = "${var.nom_projet}-ssh"
  public_key = var.cle_ssh_publique
}

# Volume séparé pour les données PostgreSQL.
# Le serveur peut être détruit et recréé sans perdre la base : c'est ce qui
# distingue une reconstruction d'une catastrophe. Le 2026-08-28, une remise à
# zéro de Colima a effacé un volume Docker contenant des données vivantes —
# ici le volume survit à la machine.
resource "hcloud_volume" "donnees" {
  name              = "${var.nom_projet}-donnees"
  size              = var.taille_volume_go
  location          = var.localisation
  format            = "ext4"
  delete_protection = true
}

resource "hcloud_server" "app" {
  name        = var.nom_projet
  server_type = var.type_serveur
  image       = "ubuntu-24.04"
  location    = var.localisation
  ssh_keys    = [hcloud_ssh_key.principale.id]

  firewall_ids = [hcloud_firewall.web.id]

  user_data = templatefile("${path.module}/cloud-init.yaml", {
    volume_device = hcloud_volume.donnees.linux_device
    utilisateur   = var.utilisateur_deploiement
    cle_ssh       = var.cle_ssh_publique
  })

  public_net {
    ipv4_enabled = true
    ipv6_enabled = true
  }

  labels = {
    projet      = var.nom_projet
    environment = "production"
  }
}

resource "hcloud_volume_attachment" "donnees" {
  volume_id = hcloud_volume.donnees.id
  server_id = hcloud_server.app.id
  automount = false # le montage est géré par cloud-init, avec fstab
}

# Pare-feu : seuls HTTP, HTTPS et SSH entrent.
# PostgreSQL (5432) reste volontairement absent — la base n'est jamais exposée,
# elle n'est jointe que depuis le réseau Docker interne.
resource "hcloud_firewall" "web" {
  name = "${var.nom_projet}-web"

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "80"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction  = "in"
    protocol   = "tcp"
    port       = "443"
    source_ips = ["0.0.0.0/0", "::/0"]
  }

  rule {
    direction = "in"
    protocol  = "tcp"
    port      = "22"
    # Restreindre à var.ips_ssh_autorisees plutôt que d'ouvrir SSH au monde.
    # Par défaut ouvert, car un enfermement dehors sur un serveur sans console
    # de secours coûte plus cher qu'il ne protège ; à resserrer une fois l'IP
    # de sortie stable connue.
    source_ips = var.ips_ssh_autorisees
  }

  rule {
    direction  = "in"
    protocol   = "icmp"
    source_ips = ["0.0.0.0/0", "::/0"]
  }
}
