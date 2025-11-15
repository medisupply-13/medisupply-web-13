describe('Sales Report Generation', () => {
  beforeEach(() => {
    // Login before each test using custom command
    const email = Cypress.env('TEST_EMAIL');
    const password = Cypress.env('TEST_PASSWORD');
    expect(email).to.exist;
    expect(password).to.exist;
    cy.login(email, password);

    // Navigate to sales report page
    cy.visit('/reportes/generar-venta');
    cy.waitForApp();
  });

  it('should display the sales report form', () => {
    // Check if the form elements are visible
    cy.get('app-custom-select').should('be.visible');
    cy.get('app-custom-select').should('have.length.at.least', 2);
    cy.get('button[mat-flat-button]').contains('Generar un reporte', { matchCase: false }).should('be.visible');

    // Check if page title is visible
    cy.get('app-page-header').should('be.visible');
  });

  it('should select Pedro Ramirez from vendor list and semestral period', () => {
    // Verify the form is visible and ready
    cy.get('app-custom-select', { timeout: 8000 }).should('have.length.at.least', 2);

    // Select vendor (Pedro Ramirez)
    // First custom-select is for vendor
    cy.get('app-custom-select').first().within(() => {
      cy.get('.custom-select').should('be.visible').click();

      // Wait for options to be visible with timeout
      cy.get('.custom-options', { timeout: 5000 }).should('be.visible');

      // Find and click on Pedro Ramirez option (exact match)
      cy.get('.custom-option').contains('Pedro Ramirez', { matchCase: false }).click({ force: true });
      cy.log('✅ Pedro Ramirez encontrado y seleccionado');
    });

    // Select period (semestral)
    // Second custom-select is for period
    cy.get('app-custom-select').eq(1).within(() => {
      cy.get('.custom-select').should('be.visible').click();

      // Wait for options to be visible with timeout
      cy.get('.custom-options', { timeout: 5000 }).should('be.visible');

      // Find and click on semestral option
      cy.get('.custom-option').contains('semestral', { matchCase: false }).click({ force: true });
      cy.log('✅ Período semestral seleccionado');
    });

    // Wait a moment for Angular to process the changes and enable the button
    cy.wait(500);

    // Verify the generate button is visible and enabled
    cy.get('button[mat-flat-button]').contains('Generar un reporte', { matchCase: false })
      .should('be.visible')
      .should('not.be.disabled');

    // Click on generate report button - use force if needed
    cy.get('button[mat-flat-button]').contains('Generar un reporte', { matchCase: false })
      .click({ force: true });
    cy.log('✅ Botón Generar un reporte clickeado');

    // Wait for the report to be generated - use should() with timeout instead of fixed wait
    cy.get('.report-result', { timeout: 10000 }).should('be.visible');
    cy.log('✅ Reporte generado correctamente');

    // Verify period info is shown
    cy.get('.period-info').should('be.visible');
    cy.get('.period-info h3').should('contain.text', 'semestral');
    cy.get('.period-dates').should('be.visible');
    cy.log('✅ Información del período visible');

    // Verify summary boxes are shown
    cy.get('.summary').should('be.visible');
    cy.get('.summary .box').should('have.length.at.least', 2);
    cy.get('.summary .box').first().should('contain.text', 'Ventas totales');
    cy.get('.summary .box').eq(1).should('contain.text', 'Pedidos');
    cy.log('✅ Cajas de resumen visibles');

    // Verify products table is shown and has products
    cy.get('.sales-table').should('be.visible');
    cy.get('.sales-table thead').should('be.visible');
    cy.get('.sales-table thead th').should('contain.text', 'Producto');
    cy.get('.sales-table thead th').should('contain.text', 'Ventas');

    // Verify that there are products in the table
    cy.get('.sales-table tbody tr').should('have.length.greaterThan', 0);
    cy.log('✅ Tabla de productos visible con datos');

    // Verify chart is shown
    cy.get('.chart').should('be.visible');
    cy.get('.chart h3').should('contain.text', 'Desglose');

    // Verify ngx-charts-line-chart is rendered
    cy.get('ngx-charts-line-chart', { timeout: 8000 }).should('exist');

    // Verify chart has SVG elements
    cy.get('ngx-charts-line-chart').within(() => {
      cy.get('svg', { timeout: 3000 }).should('exist');
    });
    cy.log('✅ Gráfico visible y renderizado');

    // Take a screenshot to verify the report is displayed
    cy.screenshot('reporte-ventas-generado', { capture: 'viewport' });
  });
});

