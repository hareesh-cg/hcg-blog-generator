// src/parsers/markdown.ts

import fs from 'fs/promises';
import matter from 'gray-matter'; // Renamed import for clarity
import { marked } from 'marked'; // Import the function directly
import type { FrontMatter } from '../content/models'; // Use our defined type

/**
 * Represents the result of parsing a Markdown file.
 */
export interface ParsedMarkdown {
  frontMatter: FrontMatter;
  markdownContent: string; // The content part after front matter
  htmlContent: string;     // The content rendered as HTML
}

/**
 * Reads a Markdown file, parses its front matter, and renders the Markdown content to HTML.
 *
 * @param filePath Absolute path to the Markdown file.
 * @returns A Promise resolving to the ParsedMarkdown object.
 * @throws If the file cannot be read or parsed.
 */
export async function parseMarkdownFile(filePath: string): Promise<ParsedMarkdown> {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');

    // Use gray-matter to parse front matter and content
    // Ensure date fields are parsed into Date objects
    const { data: frontMatterData, content: markdownContent } = matter(fileContent, {
         engines: {
            // Potentially add custom parsing engines later if needed (e.g., TOML)
         },
         // Ensure dates are parsed automatically by gray-matter if possible
         // or handle date conversion manually after parsing if needed.
         // gray-matter's default YAML parser (js-yaml) often handles ISO date strings.
    });

    // --- Data Cleaning & Type Handling ---
    const frontMatter: FrontMatter = { ...frontMatterData }; // Copy data

    // Explicitly convert 'date' field to Date object if it exists and isn't already one
    if (frontMatter.date && !(frontMatter.date instanceof Date)) {
        try {
            frontMatter.date = new Date(frontMatter.date);
             // Check if the date is valid after conversion
            if (isNaN(frontMatter.date.getTime())) {
                console.warn(`[Warning] Invalid date format in front matter for file: ${filePath}. Value: ${frontMatterData.date}`);
                // Decide handling: keep original string, set to undefined, or throw error?
                // Let's set to undefined for now to avoid errors later, but flag it.
                frontMatter.date = undefined;
            }
        } catch (dateError) {
             console.warn(`[Warning] Could not parse date in front matter for file: ${filePath}. Value: ${frontMatterData.date}`);
             frontMatter.date = undefined;
        }
    }

     // Ensure 'tags' and 'categories' are arrays of strings if they exist
    if (frontMatter.tags && !Array.isArray(frontMatter.tags)) {
         console.warn(`[Warning] 'tags' field in ${filePath} is not an array. Converting...`);
         frontMatter.tags = [String(frontMatter.tags)]; // Simple conversion
    } else if (Array.isArray(frontMatter.tags)) {
         frontMatter.tags = frontMatter.tags.map(tag => String(tag)); // Ensure all elements are strings
    }

    if (frontMatter.categories && !Array.isArray(frontMatter.categories)) {
         console.warn(`[Warning] 'categories' field in ${filePath} is not an array. Converting...`);
         frontMatter.categories = [String(frontMatter.categories)]; // Simple conversion
    } else if (Array.isArray(frontMatter.categories)) {
         frontMatter.categories = frontMatter.categories.map(cat => String(cat)); // Ensure all elements are strings
    }


    // Configure marked (optional, customize as needed)
    // TODO: Add syntax highlighting options later
    marked.setOptions({
      renderer: new marked.Renderer(),
      // highlight: function(code, lang) {
      //   // Add syntax highlighting logic here later
      //   return code;
      // },
      pedantic: false,
      gfm: true, // Enable GitHub Flavored Markdown
      breaks: false
    });

    // Render Markdown to HTML
    // Use marked.parse() for async (though the core might be sync)
    const htmlContent = await marked.parse(markdownContent);

    return {
      frontMatter,
      markdownContent,
      htmlContent,
    };
  } catch (error: any) {
    console.error(`Error processing Markdown file: ${filePath}`);
    // Re-throw the error to be handled by the caller
    throw error;
  }
}