// src/index.ts
import path from 'path';
import { loadConfig } from './config';
import { processContent } from './content/processor'; // Import the processor

async function main() {
  console.log("HcgBlogGenerator test runner starting...");
  const exampleSiteDir = path.resolve(__dirname, '../example-site');

  try {
    // 1. Load Configuration
    const config = await loadConfig('config.json', exampleSiteDir);
    console.log("\n--- Configuration Loaded ---");
    // console.log(JSON.stringify(config, null, 2)); // Optionally log full config

    // 2. Process Content
    const siteContent = await processContent(config);
    console.log("\n--- Content Processing Complete ---");

    // Log summaries for verification
    console.log(`\nFound ${siteContent.posts.length} Posts:`);
    siteContent.posts.forEach(post => console.log(`  - ${post.permalink} (Date: ${post.date.toISOString().split('T')[0]}, Title: ${post.frontMatter.title})`));

    console.log(`\nFound ${siteContent.pages.length} Pages:`);
    siteContent.pages.forEach(page => console.log(`  - ${page.permalink} (Source: ${page.relativePath}, Title: ${page.frontMatter.title || 'N/A'}, Type: ${page.fileType})`));

    console.log(`\nFound ${siteContent.drafts.length} Drafts:`);
    siteContent.drafts.forEach(draft => console.log(`  - ${draft.permalink} (Source: ${draft.relativePath}, Title: ${draft.frontMatter.title || 'N/A'})`));

    // Optionally log full details of one item for deeper inspection
    // if (siteContent.posts.length > 0) {
    //    console.log("\n--- Example Post Details ---");
    //    console.log(JSON.stringify(siteContent.posts[0], null, 2));
    // }


  } catch (error) {
    console.error("\n--- Error during execution ---");
    console.error(error);
    process.exit(1);
  }
}

main();