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

  Scenario: Production booking workflow end-to-end
    When I navigate to "https://maisonnette-pecheur-bertheaume.fr/gites/maisonnette"
    Then la page charge
    And je vois "Maisonnette" ou "gite" ou "booking"

  Scenario: Production authentication flow with Keycloak
    Given the production environment is configured
    And the Keycloak client is configured
    When I initiate OAuth2 authorization flow
    Then the authorization endpoint is accessible
    And the client "maisonnettev2-frontend" is valid

  Scenario: Production API health endpoint responds
    When I check the health endpoint
    Then the response status is 200
    And the response contains "healthy" ou "status"

  Scenario: Production database migrations are applied
    Given the production environment is configured
    Then the production database has latest migrations
    And all schema tables exist

  Scenario: Production services are healthy
    Given the production environment is configured
    Then the production frontend is accessible via HTTPS
    And the production backend API is responding
    And the production database is accessible
    And the Keycloak realm is accessible

  Scenario: Keycloak OAuth2 client is configured
    Given the Keycloak realm is accessible
    When I request the OAuth2 authorization endpoint
    Then the response status is not 400
    And the response does not contain "Client not found"
