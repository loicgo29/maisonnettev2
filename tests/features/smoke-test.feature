Feature: Smoke Tests - Service Health

  Scenario: All Docker services are healthy
    When I check the Docker container status
    Then maisonnettev2-frontend container is running
    And maisonnettev2-backend container is running
    And postgres-maisonnettev2 container is running
    And no container is restarting

  Scenario: Backend API is healthy
    When I check the backend health endpoint
    Then the backend returns status code 200
    And the response contains healthy status

  Scenario: Database connection works
    When I attempt to connect to the database
    Then the database connection succeeds
