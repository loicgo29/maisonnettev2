@oauth-admin
Feature: Admin OAuth2 Login via Keycloak
  As an admin user
  I want to login via OAuth2 (Keycloak)
  So that I can access the admin dashboard securely

  Background:
    Given the admin dashboard is available at the admin path
    And the test Keycloak is running

  Scenario: Unauthenticated user is redirected to Keycloak
    When I navigate to the admin dashboard
    Then I should be redirected to Keycloak login page
    And I should see the login form

  Scenario: Successful OAuth2 login stores token in sessionStorage
    Given I am on the Keycloak login page
    When I enter valid credentials
    And I submit the login form
    Then I should be redirected to the admin callback page
    And the auth token should be stored in sessionStorage
    And the dashboard should load successfully

  Scenario: Invalid token causes 401 error
    Given I have an invalid token in sessionStorage
    When I navigate to the admin dashboard
    Then I should be redirected to login

  Scenario: User can logout
    Given I am logged in with a valid token
    When I click the "Se déconnecter" button
    Then I should be redirected to Keycloak logout
    And the sessionStorage token should be cleared

  Scenario: Token persists across page reloads
    Given I am logged in with a valid token
    When I reload the page
    Then the token should still be in sessionStorage
    And the dashboard should load without re-authentication

  Scenario: Expired token triggers re-authentication
    Given my token has expired
    When I try to access the dashboard
    Then I should be redirected to Keycloak login page
    And a new authentication flow should begin
