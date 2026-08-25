Feature: Health Check Tests

  Scenario: Frontend is accessible
    When I navigate to http://localhost:5173
    Then the page loads with HTTP 200

  Scenario: Backend API health endpoint responds
    When I call GET http://localhost:3001/health
    Then the response status is 200
    And the JSON contains status = healthy

  Scenario: API Swagger documentation is available
    When I navigate to http://localhost:3001/api/docs
    Then the page loads with HTTP 200

  Scenario: Docker containers are running
    When I list the Docker containers
    Then container maisonnettev2-frontend is running
    And container maisonnettev2-backend is running
    And container postgres-maisonnettev2 is running
    And no containers are restarting
