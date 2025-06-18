import PageObjects from '../pageObjects/PageObjects';

describe('Recorded Test for https://qar-1-qa-uw2-us-int-ls-qa.csodqa.com/ui/chr-userrecord-builder-ui/app/builder', () => {
  it('should replay user actions on https://qar-1-qa-uw2-us-int-ls-qa.csodqa.com/ui/chr-userrecord-builder-ui/app/builder', () => {
    cy.visit('https://qar-1-qa-uw2-us-int-ls-qa.csodqa.com/ui/chr-userrecord-builder-ui/app/builder');
    cy.xpath(PageObjects.xpathActiveStatus).click();
    cy.xpath(PageObjects.xpathFirstName).click();
    cy.xpath(PageObjects.xpathAddSectionButton).click();
  });
});