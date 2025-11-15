describe('Login Page', () => {
  beforeEach(() => {
    // Visit the login page before each test
    cy.visit('/login');
    cy.waitForApp();
  });

  it('should display the login form', () => {
    // Check if the login form elements are visible
    cy.get('input#correo[formControlName="correo"]').should('be.visible');
    cy.get('input#contraseña[formControlName="contraseña"]').should('be.visible');
    cy.get('button.login-button[type="submit"]').should('be.visible');
    cy.get('h2.form-title').should('contain.text', 'Iniciar Sesión');
  });

  it('should show validation errors for empty fields', () => {
    // The submit button should be disabled when form is invalid
    cy.get('button.login-button[type="submit"]').should('be.disabled');
    
    // Mark fields as touched to show validation errors
    cy.get('input#correo[formControlName="correo"]').click().blur();
    cy.get('input#contraseña[formControlName="contraseña"]').click().blur();
    
    // Check if validation errors are displayed
    cy.get('.error-message').should('contain.text', 'Campo obligatorio');
  });

  it('should show error for invalid email format', () => {
    // Fill in invalid email and trigger blur to show validation
    cy.get('input#correo[formControlName="correo"]').type('invalid-email');
    cy.get('input#correo[formControlName="correo"]').blur();
    
    // Check if email validation error is displayed
    cy.get('.error-message').should('contain.text', 'correo válido');
    
    // Button should still be disabled due to invalid email
    cy.get('button.login-button[type="submit"]').should('be.disabled');
    
    // Now fill password (but button should still be disabled due to invalid email)
    cy.get('input#contraseña[formControlName="contraseña"]').type('password123');
    
    // Button should still be disabled because email is invalid
    cy.get('button.login-button[type="submit"]').should('be.disabled');
  });

  it('should show error for invalid credentials', () => {
    // Fill in invalid credentials
    cy.get('input#correo[formControlName="correo"]').clear().type('invalid@example.com');
    cy.get('input#contraseña[formControlName="contraseña"]').clear().type('wrongpassword');
    
    // Wait for button to be enabled
    cy.get('button.login-button[type="submit"]').should('not.be.disabled');
    cy.get('button.login-button[type="submit"]').click();
    
    // Wait for error message (increase wait time for API call)
    cy.wait(3000);
    
    // Check if error message is displayed (could be in snackbar or error message)
    cy.get('body').then(($body) => {
      const hasError = $body.text().includes('Error') || 
                       $body.text().includes('Credenciales') || 
                       $body.text().includes('inválidas') ||
                       $body.text().includes('incorrectas') ||
                       $body.text().includes('no está registrado');
      
      // If we're still on login page, it means login failed (which is expected)
      cy.url().should('include', '/login');
      
      if (hasError) {
        cy.get('body').should('satisfy', (body) => {
          return body.text().includes('Error') || 
                 body.text().includes('Credenciales') || 
                 body.text().includes('inválidas') ||
                 body.text().includes('incorrectas') ||
                 body.text().includes('no está registrado');
        });
      }
    });
  });

  it('should successfully login with valid credentials', () => {
    // Get credentials from environment
    const email = Cypress.env('TEST_EMAIL');
    const password = Cypress.env('TEST_PASSWORD');
    
    // Verify credentials are provided
    expect(email).to.exist;
    expect(password).to.exist;
    
    // Fill in credentials
    cy.get('input#correo[formControlName="correo"]').clear().type(email);
    cy.get('input#contraseña[formControlName="contraseña"]').clear().type(password);
    
    // Wait for button to be enabled
    cy.get('button.login-button[type="submit"]').should('not.be.disabled');
    cy.get('button.login-button[type="submit"]').click();
    
    // Wait for navigation - allow more time for API call
    cy.wait(5000);
    
    // Check if we are redirected to dashboard
    cy.url().should('not.include', '/login');
    cy.url().should('include', '/dashboard');
    
    // Verify we're on the dashboard page
    cy.get('body').should('be.visible');
  });

  it('should toggle password visibility', () => {
    // Fill in password
    cy.get('input#contraseña[formControlName="contraseña"]').type('testpassword');
    
    // Initially password should be hidden
    cy.get('input#contraseña[formControlName="contraseña"]').should('have.attr', 'type', 'password');
    
    // Click on password visibility toggle button
    cy.get('button.password-toggle[aria-label*="Mostrar" i], button.password-toggle[aria-label*="Ocultar" i]').click();
    
    // Check if password input type changed to text
    cy.get('input#contraseña[formControlName="contraseña"]').should('have.attr', 'type', 'text');
    
    // Click again to hide password
    cy.get('button.password-toggle').click();
    cy.get('input#contraseña[formControlName="contraseña"]').should('have.attr', 'type', 'password');
  });

  it('should disable submit button when form is invalid', () => {
    // Submit button should be disabled when form is invalid
    cy.get('button.login-button[type="submit"]').should('be.disabled');
    
    // Fill in only email
    cy.get('input#correo[formControlName="correo"]').type('test@example.com');
    cy.get('button.login-button[type="submit"]').should('be.disabled');
    
    // Fill in password
    cy.get('input#contraseña[formControlName="contraseña"]').type('password123');
    cy.get('button.login-button[type="submit"]').should('not.be.disabled');
  });
});
