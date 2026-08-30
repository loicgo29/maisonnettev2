@production
Feature: Production Deployment on Hetzner
  As a DevOps engineer
  I want to verify the production deployment on Hetzner
  So that users can access the application reliably

  Background:
    Given the production environment is configured

  Scenario: Production frontend is accessible via HTTPS
    Then the production frontend is accessible via HTTPS

  Scenario: Production backend API is responding
    Then the production backend API is responding

  Scenario: Production Keycloak realm is configured
    Then the production Keycloak realm is accessible

  Scenario: Production database is connected
    Then the production database is accessible

  Scenario: All production containers are running (via SSH)
    When I check remote Docker containers on Hetzner
    Then the remote backend container is running
    And the remote frontend container is running
    And the remote database container is running
    And no remote containers are restarting

  Scenario: Production admin dashboard is accessible
    When I navigate to "https://maisonnette-pecheur-bertheaume.fr/admin"
    Then la page charge

  Scenario: Production API endpoints are documented
    When I navigate to "https://maisonnette-pecheur-bertheaume.fr/api/docs"
    Then la page charge
    And je vois "swagger" ou "openapi"
