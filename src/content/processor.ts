// src/content/processor.ts

import path from 'path';
import fs from 'fs/promises';
import glob from 'fast-glob';
import slugify from 'slugify';
import type { SiteConfig } from '../config';
import type { SiteContent, ContentItem, Post, Page, FrontMatter } from './models';
import { parseMarkdownFile } from '../parsers/markdown';
import { URL } from 'url'; // Used for joining URL paths safely

/**
 * Processes source files (Markdown, HTML) into structured content objects.
 *
 * @param config The loaded site configuration.
 * @returns A Promise resolving to the SiteContent object.
 */
export async function processContent(config: SiteConfig): Promise<SiteContent> {
  console.log('Starting content processing...');

  const posts: Post[] = [];
  const pages: Page[] = [];
  const drafts: ContentItem[] = []; // Can hold draft posts or pages

  // --- Helper: Generate Permalink ---
  // Creates a URL-safe, slash-prefixed path like /blog/my-post-title/ or /about/
  const generatePermalink = (
    itemPath: string, // Relative path from source (e.g., posts/my-post.md or pages/about.md)
    frontMatter: FrontMatter,
    itemType: 'post' | 'page' | 'draft'
  ): string => {
    const parsedPath = path.parse(itemPath); // dir, base, ext, name
    let slug: string;

    // 1. Use front matter slug if provided
    if (frontMatter.slug) {
      slug = slugify(frontMatter.slug, { lower: true, strict: true });
    } else {
      // 2. For posts, remove date prefix if present
      if (itemType === 'post') {
        const nameWithoutDate = parsedPath.name.replace(/^\d{4}-\d{2}-\d{2}-/, '');
        slug = slugify(nameWithoutDate, { lower: true, strict: true });
      } else {
        // 3. For pages/drafts, slugify the filename directly
        slug = slugify(parsedPath.name, { lower: true, strict: true });
      }
    }

    let pathSegments: string[];

    // Determine base path based on type
    if (itemType === 'post') {
        // Posts always go under /blog/ for now (can be configurable later via config.permalink.posts)
        pathSegments = ['blog', slug];
    } else if (itemType === 'draft') {
         // Drafts go under /drafts/
         pathSegments = ['drafts', slug];
    } else { // page
        // Pages go relative to the root, preserving directory structure *within* pages/
        const pagesBaseDirName = path.basename(config.paths.pages); // Get the name "pages"
        const dirSegments = parsedPath.dir.split(path.sep).filter(Boolean); // e.g., [], ['pages'], ['pages', 'something']

        // Filter out the base 'pages' directory name from the segments
        const relevantSegments = dirSegments.filter(segment => segment !== pagesBaseDirName);

         // Handle index files (e.g., pages/something/index.md -> /something/)
         if (slug === 'index') {
            pathSegments = [...relevantSegments]; // Use only the directory segments
         } else {
             pathSegments = [...relevantSegments, slug]; // Add the slug to the segments
         }
    }


    // Construct the permalink, ensuring leading slash and handling potential //
    // Using URL constructor normalizes paths nicely (e.g., handles joining correctly)
    // Use a dummy base, we only care about the pathname part.
    const joinedPath = pathSegments.join('/');
    const permalinkUrl = new URL(joinedPath.startsWith('/') ? joinedPath : '/' + joinedPath, 'http://dummybase.com');

    // Ensure trailing slash for directory-like URLs (including index files)
    let finalPermalink = permalinkUrl.pathname;
     if (finalPermalink !== '/' && (slug === 'index' || path.extname(itemPath).toLowerCase() === '.md')) {
        // Add trailing slash if it's not the root and represents a directory index
         if (!finalPermalink.endsWith('/')) {
            finalPermalink += '/';
        }
     } else if (finalPermalink !== '/' && !finalPermalink.endsWith('/') && path.extname(itemPath) === '' && slug !== 'index') {
      // Handle case where slug might not have an extension implied, like from frontmatter slug - add trailing slash
        finalPermalink += '/';
    }

    return finalPermalink;
  };

  // --- Helper: Generate Output Path ---
  const generateOutputPath = (permalink: string): string => {
    let filePath = permalink;
     // If permalink ends with '/', assume it's a directory index
    if (permalink.endsWith('/')) {
      filePath += 'index.html';
    } else {
      // Otherwise, append .html extension if it doesn't have one
       if (!path.extname(filePath)) {
          filePath += '.html';
       }
    }
    // Remove leading slash for joining with output directory
    const relativeOutputPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
    return path.resolve(config.paths.output, relativeOutputPath);
  };


  // --- Process items (Posts, Pages, Drafts) ---
  const processItem = async (
      filePath: string, // Absolute path to source file
      itemType: 'post' | 'page' | 'draft'
    ): Promise<ContentItem | Post | Page | null> => {
        const relativePath = path.relative(config.paths.source, filePath);
        const fileExtension = path.extname(filePath).toLowerCase();
        const fileType = fileExtension === '.md' ? 'markdown' : 'html'; // Basic type detection
        const isDraft = itemType === 'draft'; // Mark drafts explicitly

        try {
            let frontMatter: FrontMatter = {};
            let rawContent: string = '';
            let htmlContent: string = ''; // Final HTML body

            if (fileType === 'markdown') {
                const parsed = await parseMarkdownFile(filePath);
                frontMatter = parsed.frontMatter;
                rawContent = parsed.markdownContent;
                htmlContent = parsed.htmlContent;
            } else if (fileType === 'html') {
                // For raw HTML files, read the content
                // Optionally, we could try parsing front matter from HTML comments,
                // but let's keep it simple: treat entire file as content body for now.
                rawContent = await fs.readFile(filePath, 'utf-8');
                htmlContent = rawContent; // Pass HTML through directly
                // If needed later, parse <!-- --- front matter --- --> here
                // frontMatter = parseHtmlFrontMatter(rawContent);
            } else {
                console.warn(`[Warning] Skipping unsupported file type: ${filePath}`);
                return null; // Skip unsupported files
            }

            // Skip explicitly unpublished items unless they are drafts
            if (frontMatter.published === false && !isDraft) {
                console.log(`Skipping unpublished item: ${relativePath}`);
                return null;
            }

            // Determine permalink and output path
            const permalink = generatePermalink(relativePath, frontMatter, itemType);
            const outputPath = generateOutputPath(permalink);

            // Base content item
            const baseItem: ContentItem = {
                id: relativePath, // Use relative path as unique ID for now
                sourcePath: filePath,
                relativePath: relativePath,
                fileType: fileType,
                isDraft: isDraft,
                frontMatter: frontMatter,
                rawContent: rawContent,
                htmlContent: htmlContent,
                permalink: permalink,
                outputPath: outputPath,
                // outputHref will be calculated later based on context (relative linking)
                outputHref: '', // Placeholder
            };

            // Augment for Posts (require date)
            if (itemType === 'post') {
                if (!frontMatter.date || !(frontMatter.date instanceof Date) || isNaN(frontMatter.date.getTime())) {
                     console.warn(`[Warning] Skipping post due to missing or invalid date: ${relativePath}`);
                     return null; // Posts require a valid date
                }
                return {
                    ...baseItem,
                    date: frontMatter.date, // Add the required date
                } as Post;
            }

             // Return Page or base ContentItem for Drafts
             return baseItem as (Page | ContentItem); // Cast based on context

        } catch (error: any) {
             console.error(`[Error] Failed to process file ${relativePath}: ${error.message}`);
             return null; // Skip files that fail processing
        }
  };


  // --- Find and Process Files ---
  const filePatterns = [
      path.join(config.paths.posts, '**/*.{md,html}').replace(/\\/g, '/'), // Ensure forward slashes for glob
      path.join(config.paths.pages, '**/*.{md,html}').replace(/\\/g, '/'),
      path.join(config.paths.drafts, '**/*.{md,html}').replace(/\\/g, '/'),
      path.join(config.paths.source, '*.{md,html}').replace(/\\/g, '/'), // Root index.md/html etc.
  ];

  const files = await glob(filePatterns, {
      cwd: config.paths.source, // Search within the source directory
      absolute: true, // Return absolute paths
      ignore: ['**/_*/**', '**/node_modules/**'], // Ignore layout/include dirs, node_modules
      dot: false, // Don't match dotfiles by default
  });

   console.log(`Found ${files.length} potential content files.`);

  for (const filePath of files) {
        // Determine item type based on which directory it was found in
        let itemType: 'post' | 'page' | 'draft' | 'root_page'; // Use 'root_page' temporarily

        const relativeToSource = path.relative(config.paths.source, filePath);

        if (filePath.startsWith(config.paths.posts)) itemType = 'post';
        else if (filePath.startsWith(config.paths.drafts)) itemType = 'draft';
        // Check pages *after* drafts/posts in case paths are nested unusually
        else if (filePath.startsWith(config.paths.pages)) itemType = 'page';
        // Check if it's a root file like index.md (needs config.paths.source === path.dirname(filePath))
        else if (path.dirname(filePath) === config.paths.source) itemType = 'root_page';
        else {
            console.warn(`[Warning] File found outside known content directories, skipping: ${relativeToSource}`);
            continue; // Skip files not in expected locations
        }

        // Process the item
        // Note: 'root_page' is treated as 'page' for processing logic
        const processedItem = await processItem(filePath, itemType === 'root_page' ? 'page' : itemType);

        if (processedItem) {
            if (processedItem.isDraft) {
                drafts.push(processedItem);
            } else if (itemType === 'post') {
                posts.push(processedItem as Post);
            } else { // page or root_page
                pages.push(processedItem as Page);
            }
        }
  }

  // Sort posts by date (newest first)
  posts.sort((a, b) => b.date.getTime() - a.date.getTime());

  // Sort pages maybe alphabetically by permalink? Or leave as found? Let's sort by permalink.
  pages.sort((a, b) => a.permalink.localeCompare(b.permalink));
  drafts.sort((a, b) => a.permalink.localeCompare(b.permalink));

  console.log(`Processed: ${posts.length} posts, ${pages.length} pages, ${drafts.length} drafts.`);

  const siteContent: SiteContent = {
    posts,
    pages,
    drafts,
  };

  return siteContent;
}