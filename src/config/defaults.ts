// src/config/defaults.ts

import type { SiteConfig } from './types';

// Keep DEFAULT_CONFIG as defined before
export const DEFAULT_CONFIG: Partial<SiteConfig> = {
  title: 'My Awesome HcgBlog',
  baseUrl: '/',
  paths: { // These ARE all defined here
    source: '.',
    output: 'output',
    posts: 'posts',
    pages: 'pages',
    drafts: 'drafts',
    layouts: 'layouts',
    includes: 'includes',
    assets: 'assets',
  },
  pagination: {
    perPage: 10,
    blogPathPrefix: '/blog/page'
  },
};

export function mergeConfigs(
  userConfig: Partial<SiteConfig>,
  defaultConfig: Partial<SiteConfig>
): SiteConfig {
    const merged = { ...defaultConfig, ...userConfig };

    // --- Merge nested paths specifically ---
    if (userConfig.paths) {
        // If user provides paths, merge them over the default paths
        merged.paths = { ...defaultConfig.paths, ...userConfig.paths };
    } else if (defaultConfig.paths) {
        // If user doesn't provide paths, use the defaults.
        // Assert the type here because we KNOW defaultConfig.paths provides all required keys.
        merged.paths = { ...defaultConfig.paths } as SiteConfig['paths']; // <--- FIX: Added type assertion
    } else {
         // Should not happen if DEFAULT_CONFIG is correctly defined, but good practice:
         throw new Error("Critical Error: Default paths configuration is missing.");
    }

    // --- Merge nested pagination specifically ---
    if (userConfig.pagination) {
        // If user provides pagination, merge them over default pagination
        // Use || {} defensively in case defaultConfig didn't have pagination
        merged.pagination = { ...(defaultConfig.pagination || {}), ...userConfig.pagination };
    } else if (defaultConfig.pagination) {
         // If user doesn't provide pagination, use the defaults (create a copy)
         merged.pagination = { ...defaultConfig.pagination };
    } else {
        // No user pagination and no default pagination
        merged.pagination = undefined; // Ensure it's explicitly undefined
    }


    // --- Validation ---
    if (!merged.title || typeof merged.title !== 'string') {
        throw new Error("Configuration Error: 'title' is missing or not a string.");
    }
    if (!merged.baseUrl || typeof merged.baseUrl !== 'string') {
        throw new Error("Configuration Error: 'baseUrl' is missing or not a string.");
    }
     if (!merged.paths || typeof merged.paths !== 'object' ||
        !merged.paths.source || !merged.paths.output || !merged.paths.posts ||
        !merged.paths.pages || !merged.paths.drafts || !merged.paths.layouts ||
        !merged.paths.includes || !merged.paths.assets) {
        // This validation implicitly checks if the assertion above was correct
        throw new Error("Configuration Error: 'paths' object is incomplete or invalid after merge.");
    }
    // Optional: Add validation for pagination if it's considered required
    // if (merged.pagination && (typeof merged.pagination.perPage !== 'number' || typeof merged.pagination.blogPathPrefix !== 'string')) {
    //    throw new Error("Configuration Error: 'pagination' object is incomplete or invalid.");
    // }


    // We assert the final merged object matches the SiteConfig interface after merging and validation.
    return merged as SiteConfig;
}