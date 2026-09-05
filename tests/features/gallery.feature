Feature: Photo Gallery Tests

  Scenario: Gallery displays with 8 photos
    When I navigate to the gallery page
    Then the page loads successfully
    And the gallery contains 8 photos
    And the image counter shows correct value

  Scenario: All photos have correct filenames
    When I check the gallery page
    Then photo 1 filename is IMG_0618.JPG
    And photo 2 filename is IMG_0627.JPG
    And photo 3 filename is IMG_0632.JPG
    And photo 4 filename is IMG_0621.JPG
    And photo 5 filename is GOPR5979.JPG
    And photo 6 filename is IMG_0613.JPG
    And photo 7 filename is IMG_0619.JPG
    And photo 8 filename is GOPR5983.JPG

  Scenario: Gallery navigation buttons exist
    When I check the gallery page
    Then navigation buttons are present
    And expand button is available
    And lightbox is configured

  Scenario: Gallery is responsive
    When I check the gallery page
    Then thumbnails grid is responsive
    And main image adapts to screen size
    And gallery counter displays correctly
