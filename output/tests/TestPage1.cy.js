import PageObjects from '../pageObjects/PageObjects';

describe('Recorded Test for https://qar-1-qa-uw2-us-int-ls-qa.csodqa.com/LMS/catalog/Welcome.aspx?tab_page_id=-67', () => {
  it('should replay user actions on https://qar-1-qa-uw2-us-int-ls-qa.csodqa.com/LMS/catalog/Welcome.aspx?tab_page_id=-67', () => {
    cy.visit('https://qar-1-qa-uw2-us-int-ls-qa.csodqa.com/LMS/catalog/Welcome.aspx?tab_page_id=-67');
    cy.xpath(PageObjects.xpathWelcomeTestuserAutoToYourTalentManagementCenter).click();
    cy.xpath(PageObjects.xpathWelcomeTestuserAutoToYourTalentManagementCenter).click();
    cy.xpath(PageObjects.xpathWelcomeTestuserAutoToYourTalentManagementCenter).click();
    cy.xpath(PageObjects.xpathGenerated3deccc).click();
    cy.xpath(PageObjects.xpathUniversalProfile).click();
  });
});