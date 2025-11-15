describe('Products Page', () => {
  beforeEach(() => {
    // Login first to access products page
    const email = Cypress.env('TEST_EMAIL') || 'test@example.com';
    const password = Cypress.env('TEST_PASSWORD') || 'testpassword';
    
    cy.visit('/login');
    cy.get('input#correo[formControlName="correo"]').type(email);
    cy.get('input#contraseña[formControlName="contraseña"]').type(password);
    cy.get('button.login-button[type="submit"]').click();
    cy.wait(3000);
    
    // Navigate to products page
    cy.visit('/productos/cargar');
    cy.waitForApp();
  });

  it('should display products list', () => {
    // Check if products table or list is visible
    cy.get('table.products-table, .products-table, .product-list, mat-table').should('exist');
  });

  it('should display product columns', () => {
    // Check if product columns are displayed
    cy.get('th').should('contain.text', 'SKU')
      .or('contain.text', 'Nombre')
      .or('contain.text', 'Precio')
      .or('contain.text', 'Categoría');
  });

  it('should display add product button', () => {
    // Check if add product button exists
    cy.get('button:contains("Agregar"), button:contains("Add"), button[aria-label*="add" i], button:contains("Agregar producto")').should('exist');
  });

  it('should display upload products button', () => {
    // Check if upload products button exists
    cy.get('button:contains("Cargar"), button:contains("Upload"), button[aria-label*="upload" i], button:contains("Cargar productos")').should('exist');
  });

  it('should paginate products', () => {
    // Check if pagination controls are visible
    cy.get('mat-paginator, .pagination, [aria-label*="pagination" i]').then(($paginator) => {
      if ($paginator.length > 0) {
        cy.wrap($paginator).should('be.visible');
        
        // Try to navigate to next page if available
        cy.get('button[aria-label*="next" i], button:contains("Siguiente")').then(($btn) => {
          if ($btn.length > 0 && !$btn.is(':disabled')) {
            cy.wrap($btn).click();
            cy.wait(1000);
          }
        });
      }
    });
  });

  it('should toggle upload section', () => {
    // Click on upload button to toggle upload section
    cy.get('button:contains("Cargar"), button:contains("Upload"), button[aria-label*="upload" i]').first().click();
    cy.wait(1000);
    
    // Check if upload section is displayed
    cy.get('.upload-section, .template-section, .upload-files-section').should('be.visible');
  });
});
