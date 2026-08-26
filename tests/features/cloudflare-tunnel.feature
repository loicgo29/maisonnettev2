Feature: Cloudflare Tunnel Production Deployment
  As a developer
  I want to verify the Cloudflare tunnel is correctly configured
  So that production traffic routes through to the application

  Background:
    Given the Cloudflare tunnel is running
    And the backend service is listening on localhost:8030
    And the production domain is maisonnette-pecheur-bertheaume.fr

  Scenario: Tunnel configuration is correct
    When I check the tunnel status
    Then the tunnel should be registered with Cloudflare
    And the tunnel should have active connections (>= 1)
    And the ingress rules should point to http://localhost:8030

  Scenario: Production homepage is accessible via HTTPS
    When I access "https://maisonnette-pecheur-bertheaume.fr/"
    Then the response status code should be 200
    And the response should contain the landing page HTML
    And the response headers should include HTTPS certificate

  Scenario: Production calendar page is accessible
    When I access "https://maisonnette-pecheur-bertheaume.fr/calendar"
    Then the response status code should be 200
    And the response should contain "Calendrier" text
    And the response should be valid HTML

  Scenario: Production API gites endpoint works
    When I access "https://maisonnette-pecheur-bertheaume.fr/api/gites"
    Then the response status code should be 200
    And the response should be valid JSON
    And the response should contain at least 1 gite

  Scenario: Invalid routes return 404
    When I access "https://maisonnette-pecheur-bertheaume.fr/invalid-route"
    Then the response status code should be 404

  Scenario: WWW subdomain redirects correctly
    When I access "https://www.maisonnette-pecheur-bertheaume.fr/"
    Then the response status code should be 200
    And the response should contain the landing page HTML

  Scenario: Tunnel survives restart
    Given the tunnel is running
    When I restart the tunnel service
    Then the tunnel should reconnect within 30 seconds
    And https://maisonnette-pecheur-bertheaume.fr/ should respond with 200
