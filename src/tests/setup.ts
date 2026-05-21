jest.mock('@zaiusinc/app-sdk', () => ({
  ...jest.requireActual('@zaiusinc/app-sdk'),
  getAppContext: jest.fn().mockReturnValue({
    manifest: {
      meta: {
        app_id: 'product_catalog',
        display_name: 'Product Catalog',
        version: '1.0.0',
        vendor: 'custom',
      } as any,
    } as any,
    trackerId: 'mockTrackerId',
    installId: 123456789,
  }),
}));
