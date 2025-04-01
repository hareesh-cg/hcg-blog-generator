// src/content/models.ts

/**
 * Represents the metadata extracted from front matter.
 * Can contain any key-value pairs defined by the user.
 */
export interface FrontMatter {
    layout?: string;     // Layout file to use (e.g., 'post', 'default')
    title?: string;      // Title of the page or post
    date?: Date;         // Publication date (important for posts)
    tags?: string[];     // Content tags
    categories?: string[]; // Content categories
    published?: boolean; // Explicitly set publishing status (for drafts)
    slug?: string;       // Custom slug for permalink generation
    [key: string]: any; // Allow arbitrary custom front matter
  }
  
  /**
   * Base interface for any piece of processable content (Page, Post, Draft).
   */
  export interface ContentItem {
    id: string;             // Unique identifier (e.g., relative path or generated hash)
    sourcePath: string;     // Absolute path to the source file
    relativePath: string;   // Path relative to the source directory
    fileType: 'markdown' | 'html'; // Type of the source file
    isDraft: boolean;       // True if the item is a draft
    frontMatter: FrontMatter; // Parsed front matter data
    rawContent: string;     // Original content body (Markdown or HTML)
    htmlContent: string;    // Processed HTML content (after Markdown parsing if applicable)
    permalink: string;      // The final URL path (e.g., /blog/my-post/ or /about/)
    outputHref: string;     // Relative href for linking (e.g., ../../blog/my-post/) - calculation depends on context
    outputPath: string;     // Absolute path to the final output HTML file
  }
  
  /**
   * Represents a Blog Post, extending ContentItem with post-specific properties.
   */
  export interface Post extends ContentItem {
    // Posts usually require a date for sorting
    date: Date;
    // Add any other post-specific fields if needed later
  }
  
  /**
   * Represents a standalone Page.
   */
  export interface Page extends ContentItem {
    // Add any other page-specific fields if needed later
  }
  
  /**
   * Represents all the processed content and site data ready for rendering.
   */
  export interface SiteContent {
    posts: Post[];
    pages: Page[];
    drafts: ContentItem[]; // Drafts can be Posts or Pages, use base type for now
    // We can add other collections (e.g., from config.collections) here later
    // We can also add aggregated data like allTags, allCategories here later
  }