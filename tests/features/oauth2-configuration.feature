@production
Feature: OAuth2/Keycloak Configuration
  As a DevOps engineer
  I want to verify OAuth2 flow is correctly configured
  So that users can authenticate via Keycloak

  Scenario: Keycloak OAuth2 client is properly configured
    Given the production environment is configured
    And the Keycloak client is configured
    When I initiate OAuth2 authorization flow
    Then the authorization endpoint is accessible
    And the client "maisonnettev2-frontend" is valid
    And the redirect URI is registered in Keycloak

  Scenario: OAuth2 error handling works
    Given the production environment is configured
    And the Keycloak client is configured
    Then authentication errors are properly formatted
