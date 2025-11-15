// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login a user
       * @example cy.login('user@example.com', 'password123')
       */
      login(email: string, password: string): Chainable<void>;
      
      /**
       * Custom command to logout a user
       * @example cy.logout()
       */
      logout(): Chainable<void>;
      
      /**
       * Custom command to wait for the app to be ready
       * @example cy.waitForApp()
       */
      waitForApp(): Chainable<void>;
    }
  }
}

// Login command
Cypress.Commands.add('login', (email: string, password: string) => {
  cy.visit('/login');
  cy.get('input#correo[formControlName="correo"]').type(email);
  cy.get('input#contraseña[formControlName="contraseña"]').type(password);
  cy.get('button.login-button[type="submit"]').click();
  cy.wait(3000); // Wait for login to complete
  cy.url().should('include', '/dashboard'); // Verify we are on dashboard
});

// Logout command
Cypress.Commands.add('logout', () => {
  cy.get('button:contains("Cerrar"), button:contains("Logout"), [aria-label*="logout" i]').click();
  cy.wait(1000);
});

// Wait for app to be ready
Cypress.Commands.add('waitForApp', () => {
  cy.get('body').should('be.visible');
  cy.wait(1000);
});

export {};
