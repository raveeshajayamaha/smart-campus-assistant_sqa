Feature: Students receive current campus information

  Scenario: BDD-01 Administrator updates library opening hours
    Given an administrator and a student are signed in
    And the campus library opens from "08:00-18:00"
    When the administrator updates the library hours to "09:00-17:00"
    Then the student sees "09:00-17:00" in the campus locations feed
    And the student receives "09:00-17:00" from the assistant for that library

  Scenario: BDD-02 Student asks about upcoming events in an empty catalogue
    Given a student is signed in and the event catalogue is empty
    When the student asks about upcoming events
    Then the assistant reports no upcoming events without promising a list
    And the assistant returns no event sources
