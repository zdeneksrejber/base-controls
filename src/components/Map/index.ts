//the control and its contract
export * from './interfaces';
export * from './labels';

//the provider seam: what a provider receives, and how one is defined
export * from './providers';

//the module seam: what a module receives at each stage, and the slots a map has for them
export * from './modules';

//types the contract is written in
export * from './core/directions';
export * from './core/fallbackLocation';
export * from './core/geocoding';
export * from './core/pinAppearance';
export * from './core/rules';
export * from './core/viewport';

//the control itself, and the pieces a host or a module composes with
export * from './Map';
export * from './core/attributes';
export * from './core/language';
export * from './core/pins';
export * from './core/records';
export * from './core/webResource';
export * from './map-overlay';
export * from './map-pin-swatch';
export * from './map-status';
