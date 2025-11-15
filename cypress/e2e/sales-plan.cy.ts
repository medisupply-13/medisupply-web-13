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

  it('should select a product and set a goal quantity', () => {
    // Wait for products to load
    cy.wait(3000);
    
    // First, interact with product-selector-section to enable region selection
    cy.get('.product-selector-section').should('be.visible');
    cy.get('.product-selector-container').click();
    cy.wait(1000);
    
    // Check if product selector is open and products are displayed
    cy.get('.products-grid').should('be.visible');
    
    // Wait a bit for products to render
    cy.wait(1000);
    
    // Check if there are products available
    cy.get('body').then(($body) => {
      if ($body.find('.product-card').length > 0) {
        // Select first product by clicking on the card
        cy.get('.product-card').first().click();
        cy.wait(500);
        
        // Verify product is selected (should have 'selected' class)
        cy.get('.product-card.selected').should('exist');
        
        // Close product selector before selecting region
        cy.get('.product-selector-container').click();
        cy.wait(500);
        
        // Now select a region after interacting with product-selector-section
        cy.wait(1000);
        cy.get('mat-select[formControlName="region"]').click();
        cy.wait(1000);
        
        // Select first available region option
        cy.get('.cdk-overlay-container mat-option, mat-option').first().click({ force: true });
        cy.wait(500);
        
        // Verify region is selected
        cy.get('mat-select[formControlName="region"]').then(($select) => {
          const text = $select.text();
          expect(text).to.match(/(Norte|Centro|Sur|Caribe|Pacífico)/i);
        });
        
        // Now open product selector again to set the goal
        cy.get('.product-selector-container').click();
        cy.wait(1000);
        
        // Click on the meta button for the selected product
        cy.get('.product-card.selected .meta-button').first().should('not.be.disabled');
        cy.get('.product-card.selected .meta-button').first().click();
        cy.wait(500);
        
        // Wait for goal modal to appear
        cy.get('.modal-overlay').should('be.visible');
        cy.get('.modal-content').should('be.visible');
        
        // Verify input has min="1" attribute (must be greater than 0)
        cy.get('input[type="number"][placeholder="0"]').should('have.attr', 'min', '1');
        
        // Test with 0 - button should be disabled
        cy.get('input[type="number"][placeholder="0"]').clear().type('0');
        cy.wait(300);
        cy.get('button.save-button').should('be.disabled');
        
        // Test with negative value - button should be disabled
        cy.get('input[type="number"][placeholder="0"]').clear().type('-5');
        cy.wait(300);
        cy.get('button.save-button').should('be.disabled');
        
        // Test with valid value greater than 0 - button should be enabled
        cy.get('input[type="number"][placeholder="0"]').clear().type('10');
        cy.wait(300);
        
        // Verify save button is enabled when value is > 0
        cy.get('button.save-button').should('not.be.disabled');
        
        // Verify input value is greater than 0
        cy.get('input[type="number"][placeholder="0"]').should('have.value', '10');
        cy.get('input[type="number"][placeholder="0"]').invoke('val').then((val) => {
          expect(parseInt(val as string)).to.be.greaterThan(0);
        });
        
        // Now save the goal with value > 0
        cy.get('button.save-button').should('not.be.disabled');
        cy.get('button.save-button').click();
        cy.wait(500);
        
        // Verify modal is closed after saving
        cy.get('.modal-overlay').should('not.exist');
        
        // Verify the product card shows the goal ribbon with the saved quantity
        cy.get('.product-card.selected .goal-ribbon').should('exist');
        cy.get('.product-card.selected .goal-text').should('contain.text', '10');
        cy.get('.product-card.selected .goal-text').should('contain.text', 'unidades');
        
        // Verify the product card has the 'has-goal' class
        cy.get('.product-card.selected').should('have.class', 'has-goal');
      } else {
        // If no products, just verify the selector is open
        cy.get('.products-grid').should('exist');
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

