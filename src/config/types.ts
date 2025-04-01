// src/config/types.ts

/**
 * Defines the structure for the site's configuration (config.json).
 */
export interface SiteConfig {
    title: string;                  // The overall title of the site
    baseUrl: string;                // The base URL of the site (e.g., https://example.com)
    description?: string;           // Optional site description for meta tags
    author?: {                      // Optional author information
      name?: string;
      email?: string;
    };
    paths: {                        // Relative paths to source directories
      source: string;               // Root source directory for the site content
      output: string;               // Directory where the static site will be generated
      posts: string;                // Directory containing blog posts
      pages: string;                // Directory containing standalone pages
      drafts: string;               // Directory containing draft posts
      layouts: string;              // Directory containing layout templates
      includes: string;             // Directory containing partial templates
      assets: string;               // Directory containing static assets (CSS, JS, images)
    };
    collections?: {                 // Define custom collections (optional)
      [key: string]: {
        path: string;               // Path relative to source dir
        outputPrefix?: string;      // Optional output path prefix (e.g., /projects/)
      };
    };
    frontMatterDefaults?: {         // Default front matter values per type/path (optional)
      scope: {
        type?: 'posts' | 'pages' | 'drafts' | string; // Type of content (posts, pages, etc.)
        path?: string;              // Specific path glob pattern
      };
      values: {
        [key: string]: any;         // Default key-value pairs
      };
    }[];
    pagination?: {                   // Pagination settings (optional)
        perPage: number;
        blogPathPrefix: string; // e.g., /blog/page/
    };
    permalink?: {                   // Permalink structure (optional, default handling applies)
        posts: string; // Example: /blog/:year/:month/:day/:slug/ (more complex later)
    };
    // Add other configuration options as needed (e.g., build options, plugin settings)
  }