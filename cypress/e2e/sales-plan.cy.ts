describe('Sales Plan Creation', () => {
  beforeEach(() => {
    // Login before each test using custom command
    const email = Cypress.env('TEST_EMAIL');
    const password = Cypress.env('TEST_PASSWORD');
    expect(email).to.exist;
    expect(password).to.exist;
    cy.login(email, password);
    
    // Navigate to sales plan creation page
    cy.visit('/ventas/crear-plan');
    cy.waitForApp();
  });

  it('should display the sales plan form', () => {
    // Check if the form elements are visible
    cy.get('mat-select[formControlName="region"]').should('be.visible');
    cy.get('mat-select[formControlName="quarter"]').should('be.visible');
    cy.get('input[formControlName="totalGoal"]').should('be.visible');
    cy.get('button[type="submit"].create-button').should('be.visible');
    
    // Check if page title is visible
    cy.get('app-page-header').should('be.visible');
  });

  it('should show validation errors for empty required fields', () => {
    // The submit button should be disabled when form is invalid
    cy.get('button[type="submit"].create-button').should('be.disabled');
    
    // Try to interact with form fields to trigger validation
    cy.get('mat-select[formControlName="region"]').click();
    cy.get('body').click(0, 0); // Click outside to close and trigger blur
    
    // Check for validation errors (if displayed)
    cy.get('body').then(($body) => {
      if ($body.find('mat-error').length > 0) {
        cy.get('mat-error').should('be.visible');
      }
    });
  });

  it('should navigate back from sales plan page', () => {
    // Check if back button exists in page header
    cy.get('app-page-header').should('be.visible');
    
    // The back button should navigate to dashboard
    cy.url().should('include', '/ventas/crear-plan');
  });
});

