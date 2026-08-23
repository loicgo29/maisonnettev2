Feature: User Journey - Gîte Booking Platform

  Scenario: Visitor browses gîtes without authentication
    Given the user is on the home page
    When the user scrolls to "Nos Gîtes" section
    Then the user should see a list of available gîtes
    And each gîte card should display name, price, and capacity

  Scenario: User navigates to gîte detail page
    Given the user is on the home page with gîtes loaded
    When the user clicks on the first gîte card
    Then the user should be taken to the gîte detail page
    And the page should display gîte information including:
      | Field       |
      | Name        |
      | Description |
      | Price/night |
      | Capacity    |
      | Photos      |

  Scenario: User initiates booking (requires authentication)
    Given the user is on a gîte detail page
    When the user clicks "Réserver" button
    Then the user should be redirected to Keycloak login
    And after successful login, booking form should appear

  Scenario: Mobile responsiveness
    Given the user is on a mobile device (375x667)
    When navigating to the home page
    Then all elements should be visible without horizontal scrolling
    And buttons should be easily tappable (min 44x44px)

  Scenario: Search/Filter gîtes (if implemented)
    Given the user is on the home page
    When the user enters a search query
    Then gîtes should be filtered in real-time
    Or show "Aucun gîte trouvé" if no matches

  Scenario: Navigation and accessibility
    Given the user is on any page
    Then all interactive elements should have:
      | Property        |
      | Proper headings |
      | ARIA labels     |
      | Keyboard access |
