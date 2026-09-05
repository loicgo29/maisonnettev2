/**
 * Test environment configuration
 *
 * Detect environment and provide URLs/credentials for tests
 */

const ENV_TYPE = process.env.TEST_ENV || 'local';

const configs = {
  local: {
    name: 'Local Development (Mac Mini)',
    type: 'local',
    frontend_url: 'http://localhost:5173',
    backend_url: 'http://localhost:3001',
    admin_url: 'http://localhost:5173/admin',
    api_health: 'http://localhost:3001/health',
    keycloak_url: 'http://localhost:9000',
    keycloak_realm_url: 'http://localhost:9000/realms/maisonnettev2',
    db_host: 'localhost',
    db_port: 5433,
    docker_available: true,
    ssh_available: false,
  },
  production: {
    name: 'Production (Hetzner)',
    type: 'production',
    frontend_url: 'https://maisonnette-pecheur-bertheaume.fr',
    backend_url: 'https://maisonnette-pecheur-bertheaume.fr/api',
    admin_url: 'https://maisonnette-pecheur-bertheaume.fr/admin',
    api_health: 'https://maisonnette-pecheur-bertheaume.fr/api/health',
    keycloak_url: 'https://auth.maisonnette-pecheur-bertheaume.fr',
    keycloak_realm_url: 'https://auth.maisonnette-pecheur-bertheaume.fr/realms/maisonnettev2',
    db_host: '23.88.35.119',
    db_port: 5433, // Exposed for external backups
    docker_available: false,
    ssh_available: true,
    ssh_host: process.env.SSH_HOST || '23.88.35.119',
    ssh_user: process.env.SSH_USER || 'deploy',
    ssh_key: process.env.SSH_KEY || `${process.env.HOME}/.ssh/maisonnettev2_hetzner`,
    docker_compose_path: '/opt/maisonnettev2',
  }
};

const config = configs[ENV_TYPE];

if (!config) {
  throw new Error(`Unknown TEST_ENV="${ENV_TYPE}". Must be: ${Object.keys(configs).join(', ')}`);
}

export default config;
export { configs, ENV_TYPE };
