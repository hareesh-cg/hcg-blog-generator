// src/config/index.ts

import fs from 'fs/promises'; // Use promises API for async operations
import path from 'path';
import type { SiteConfig } from './types';
import { DEFAULT_CONFIG, mergeConfigs } from './defaults';

/**
 * Loads, parses, merges, and validates the site configuration.
 *
 * @param configPath - The absolute or relative path to the configuration file (e.g., config.json).
 * @param baseDir - The base directory from which relative paths (like configPath) should be resolved. Usually the site's source root.
 * @returns A Promise resolving to the SiteConfig object.
 * @throws If the config file cannot be read, parsed, or validated.
 */
export async function loadConfig(
  configPath: string = 'config.json', // Default filename
  baseDir: string = process.cwd() // Default to current working directory
): Promise<SiteConfig> {
  const resolvedConfigPath = path.resolve(baseDir, configPath);
  console.log(`Attempting to load configuration from: ${resolvedConfigPath}`); // Log path

  let userConfigData: string;
  try {
    userConfigData = await fs.readFile(resolvedConfigPath, 'utf-8');
  } catch (error: any) {
    // Distinguish between file not found and other errors
    if (error.code === 'ENOENT') {
      console.warn(`Configuration file not found at ${resolvedConfigPath}. Using default configuration.`);
      // If config is optional and defaults are sufficient, return merged defaults
      // For now, let's assume config is required or defaults are used.
      // If config is truly optional, you might return mergeConfigs({}, DEFAULT_CONFIG);
      // However, if core paths depend on it, maybe it should throw.
      // Let's return merged defaults for now, but this might need adjustment.
       try {
           return mergeConfigs({}, DEFAULT_CONFIG); // Attempt to merge empty object with defaults
       } catch (mergeError: any) {
           // If even merging defaults fails (due to validation), rethrow that.
           throw new Error(`Failed to create configuration from defaults: ${mergeError.message}`);
       }

    } else {
      // Other read errors (permissions, etc.)
      throw new Error(`Failed to read configuration file at ${resolvedConfigPath}: ${error.message}`);
    }
  }

  let userConfig: Partial<SiteConfig>;
  try {
    userConfig = JSON.parse(userConfigData);
  } catch (error: any) {
    throw new Error(`Failed to parse configuration file at ${resolvedConfigPath} as JSON: ${error.message}`);
  }

  try {
      const finalConfig = mergeConfigs(userConfig, DEFAULT_CONFIG);

      // --- Resolve Paths ---
      // Important: Resolve paths defined in config relative to the *source* directory.
      // The source directory itself is resolved relative to the baseDir where loadConfig was called.
      const sourceDir = path.resolve(baseDir, finalConfig.paths.source);
      finalConfig.paths.source = sourceDir; // Store the resolved absolute source path

      // Resolve other paths relative to the now absolute sourceDir
      for (const key in finalConfig.paths) {
        if (key !== 'source' && key !== 'output') { // output is relative to baseDir, not sourceDir
           const pathKey = key as keyof SiteConfig['paths'];
           if (typeof finalConfig.paths[pathKey] === 'string') {
               finalConfig.paths[pathKey] = path.resolve(sourceDir, finalConfig.paths[pathKey]);
           }
        }
      }
      // Resolve output path relative to the baseDir (where the generator runs from)
       finalConfig.paths.output = path.resolve(baseDir, finalConfig.paths.output);

      console.log('Configuration loaded successfully:');
      console.log(JSON.stringify(finalConfig, null, 2)); // Log loaded config

      return finalConfig;

  } catch (error: any) {
       // Catch errors from mergeConfigs (validation errors)
       throw new Error(`Configuration validation failed: ${error.message}`);
  }
}

// Optional: Export types and defaults if needed elsewhere directly
export * from './types';
export * from './defaults';