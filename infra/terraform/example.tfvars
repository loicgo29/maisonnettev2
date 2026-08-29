# Modèle. Les valeurs réelles passent par TF_VAR_* depuis Bitwarden,
# jamais par un fichier versionné — voir DEPLOIEMENT-HETZNER.md.
# hcloud_token     = "…"   → export TF_VAR_hcloud_token
# cle_ssh_publique = "…"   → export TF_VAR_cle_ssh_publique

nom_projet   = "maisonnettev2"
type_serveur = "cax11"
localisation = "fsn1"

# Resserrer sur l'IP de sortie une fois celle-ci stable :
# ips_ssh_autorisees = ["203.0.113.42/32"]
