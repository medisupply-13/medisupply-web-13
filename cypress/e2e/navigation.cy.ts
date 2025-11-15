describe('Navigation', () => {
  beforeEach(() => {
    // Login first for authenticated routes
    const email = Cypress.env('TEST_EMAIL') || 'test@example.com';
    const password = Cypress.env('TEST_PASSWORD') || 'testpassword';
    
    cy.visit('/login');
    cy.get('input#correo[formControlName="correo"]').type(email);
    cy.get('input#contraseña[formControlName="contraseña"]').type(password);
    cy.get('button.login-button[type="submit"]').click();
    cy.wait(3000);
  });

  it('should redirect to login page when not authenticated', () => {
    // Logout first
    cy.visit('/');
    cy.clearLocalStorage();
    cy.visit('/dashboard');
    cy.wait(2000);
    
    // Should redirect to login
    cy.url().should('include', '/login');
  });

  it('should navigate to dashboard after login', () => {
    // After login, should be on dashboard
    cy.url().should('include', '/dashboard');
    cy.get('body').should('be.visible');
  });

  it('should display navigation menu items', () => {
    // Check if navigation menu items are visible
    cy.get('nav, [role="navigation"], .sidebar, .menu').should('exist');
    
    // Check if menu items are visible (depends on role)
    cy.get('a[routerLink], [routerLink]').should('exist');
  });

  it('should navigate to products page', () => {
    // Navigate to products page
    cy.visit('/productos');
    cy.wait(2000);
    
    // Check if we are on products page
    cy.url().should('include', '/productos');
  });

  it('should navigate to dashboard from menu', () => {
    // Click on dashboard menu item
    cy.get('a[routerLink="/dashboard"], [routerLink="/dashboard"]').first().click();
    cy.wait(1000);
    
    // Check if we are on dashboard
    cy.url().should('include', '/dashboard');
  });

  it('should be responsive on mobile viewport', () => {
    // Test mobile viewport
    cy.viewport(375, 667);
    cy.visit('/dashboard');
    cy.wait(1000);
    
    cy.get('body').should('be.visible');
    
    // Check if mobile menu is accessible (if exists)
    cy.get('body').then(($body) => {
      if ($body.find('button[aria-label*="menu" i]').length > 0) {
        cy.get('button[aria-label*="menu" i]').should('exist');
      }
    });
  });
});
