/**
 * NEOMCQ — AI TUTOR GENERATOR ALIAS MODULE
 * Re-exports CanonicalTutorGenerator for seamless import resolution across API routes and components
 */

import { CanonicalTutorGenerator } from './tutor-generator.ts';

export { CanonicalTutorGenerator, CanonicalTutorGenerator as AITutorGenerator };
export * from './tutor-generator.ts';
