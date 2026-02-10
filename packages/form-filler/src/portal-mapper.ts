/**
 * Portal Mapper - Maps AI responses to form fields
 */

import type { PortalMapping, FieldMapping } from './types';

export class PortalMapper {
  private mappings: Map<string, PortalMapping> = new Map();

  constructor() {
    this.loadMappings();
  }

  /**
   * Load portal mappings from configuration files
   */
  private loadMappings(): void {
    // TODO: Load mappings from JSON files in /mappings directory
    // For now, we'll add a placeholder mapping
  }

  /**
   * Get mapping for a specific portal
   */
  getMapping(portalId: string): PortalMapping | undefined {
    return this.mappings.get(portalId);
  }

  /**
   * Get field mapping for a specific criteria
   */
  getFieldMapping(
    portalId: string,
    criteriaId: string
  ): FieldMapping | undefined {
    const mapping = this.mappings.get(portalId);
    if (!mapping) return undefined;

    return mapping.fields.find((f) => f.criteriaId === criteriaId);
  }

  /**
   * Validate that all required fields have mappings
   */
  validateMappings(
    portalId: string,
    criteriaIds: string[]
  ): { valid: boolean; missing: string[] } {
    const mapping = this.mappings.get(portalId);
    if (!mapping) {
      return { valid: false, missing: criteriaIds };
    }

    const mappedCriteria = new Set(mapping.fields.map((f) => f.criteriaId));
    const missing = criteriaIds.filter((id) => !mappedCriteria.has(id));

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Register a new portal mapping
   */
  registerMapping(mapping: PortalMapping): void {
    this.mappings.set(mapping.portalId, mapping);
  }
}
