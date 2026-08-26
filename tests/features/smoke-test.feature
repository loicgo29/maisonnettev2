Feature: Smoke Tests - Service Health

  Scenario: Environment is properly configured
    When I check the backend health endpoint
    Then the backend returns status code 200

  Scenario: Backend API is healthy
    When I check the backend health endpoint
    Then the backend returns status code 200
    And the response contains healthy status

  Scenario: Database connection works
    When I attempt to connect to the database
    Then the database connection succeeds
