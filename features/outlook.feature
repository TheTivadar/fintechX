Feature: Send, Verify and Delete Email in Outlook.com

  Scenario: Send an email, verify it and delete items from the sent mails
    Given I am logged into Outlook
    When I send an email with a randomized subject to "tivadar.simon01@gmail.com" 
    Then I should check sent emails
    And I delete sent mails