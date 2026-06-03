// Legacy exports (deprecated - keep for backwards compatibility)
export * from './model/types';
export * from './model/hooks';

// New enterprise architecture exports
export * from './model/document';
export { DocumentMapper } from './model/document.mapper';
export { documentRepository, DocumentRepository } from './api/document.repository';
export { documentQueries, useDocumentQueries, useDocumentMutations } from './api/document.queries';
