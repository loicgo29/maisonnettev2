@local
Feature: Local Development Services
  As a developer
  I want to verify all local services are running
  So that I can develop and test the application locally

  Background:
    Given the local development environment is configured

  Scenario: All local Docker containers are running
    When I list running Docker containers
    Then the local maisonnettev2 frontend container is running
    And the local maisonnettev2 backend container is running
    And the local postgres container is running
    And the local Keycloak container is running
    And no containers are in restarting state

  Scenario: Local frontend is accessible
    When I navigate to "http://localhost:5173"
    Then la page charge avec un code HTTP 200

  Scenario: Local backend API is responding
    When I navigate to "http://localhost:3001/health"
    Then la page charge avec un code HTTP 200

  Scenario: Local Keycloak is accessible
    When I navigate to "http://localhost:9000"
    Then la page charge avec un code HTTP 200

  Scenario: Local database is connected
    When I list running Docker containers
    Then the local postgres container is running
