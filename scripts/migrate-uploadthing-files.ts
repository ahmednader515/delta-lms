import * as fs from 'fs'
import * as path from 'path'
import { UTApi } from 'uploadthing/server'

// Load environment variables from .env
try {
  const envFile = fs.readFileSync('.env', 'utf-8')
  envFile.split('\n').forEach(line => {
    const trimmedLine = line.trim()
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const [key, ...valueParts] = trimmedLine.split('=')
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '')
        if (!process.env[key.trim()]) {
          process.env[key.trim()] = value
        }
      }
    }
  })
} catch (error) {
  console.warn('⚠️  Could not load .env, using system environment variables')
}

interface OldFile {
  name: string
  key: string
  customId: string | null
  url: string
  size: number
  uploadedAt: string
}

interface MigrationResult {
  oldUrl: string
  newUrl: string | null
  success: boolean
  error?: string
}

/**
 * Migrate files from old UploadThing account to new one
 * 
 * Usage:
 *   npx tsx scripts/migrate-uploadthing-files.ts
 * 
 * Make sure UPLOADTHING_SECRET and UPLOADTHING_APP_ID are set in .env
 */
async function migrateFiles() {
  console.log('🚀 Starting UploadThing file migration...\n')

  // Load environment variables - check for token first, then fall back to secret/appId
  let token: string | undefined = process.env.UPLOADTHING_TOKEN
  const uploadthingSecret = process.env.UPLOADTHING_SECRET
  const uploadthingAppId = process.env.UPLOADTHING_APP_ID

  // If no token, create one from secret and appId
  if (!token) {
    if (!uploadthingSecret || !uploadthingAppId) {
      console.error('❌ Error: Either UPLOADTHING_TOKEN or both UPLOADTHING_SECRET and UPLOADTHING_APP_ID must be set in .env')
      console.error('   Current values:')
      console.error(`   UPLOADTHING_TOKEN: ${token ? '✅ Set' : '❌ Missing'}`)
      console.error(`   UPLOADTHING_SECRET: ${uploadthingSecret ? '✅ Set' : '❌ Missing'}`)
      console.error(`   UPLOADTHING_APP_ID: ${uploadthingAppId ? '✅ Set' : '❌ Missing'}`)
      process.exit(1)
    }

    // UTApi requires a base64-encoded token with { apiKey, appId, regions }
    // Create the token object and encode it to base64
    const tokenObject = {
      apiKey: uploadthingSecret,
      appId: uploadthingAppId,
      regions: ['us-east-1'], // Default region - UploadThing will use this
    }
    token = Buffer.from(JSON.stringify(tokenObject)).toString('base64')
    console.log('📝 Created token from UPLOADTHING_SECRET and UPLOADTHING_APP_ID')
  } else {
    console.log('✅ Using existing UPLOADTHING_TOKEN')
  }

  console.log('✅ UploadThing API initialized')
  if (uploadthingAppId) {
    console.log(`   App ID: ${uploadthingAppId}`)
  }
  console.log(`   Token: ${token.substring(0, 30)}...\n`)

  // Initialize UploadThing API client with the properly formatted token
  const utapi = new UTApi({
    token: token,
  })

  // Load the JSON file
  const jsonPath = path.join(process.cwd(), 'selected-rows.json')
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ Error: File not found: ${jsonPath}`)
    process.exit(1)
  }

  const fileData = fs.readFileSync(jsonPath, 'utf-8')
  const oldFiles: OldFile[] = JSON.parse(fileData)

  console.log(`📦 Found ${oldFiles.length} files to migrate\n`)

  const results: MigrationResult[] = []
  const urlMapping: Record<string, string> = {}

  // Process files in batches to avoid overwhelming the API
  const batchSize = 5
  let processed = 0
  let successful = 0
  let failed = 0

  for (let i = 0; i < oldFiles.length; i += batchSize) {
    const batch = oldFiles.slice(i, i + batchSize)
    console.log(`\n📤 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(oldFiles.length / batchSize)} (${i + 1}-${Math.min(i + batchSize, oldFiles.length)} of ${oldFiles.length})`)

    // Process batch in parallel
    const batchPromises = batch.map(async (file) => {
      try {
        console.log(`  ⬇️  Downloading: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`)

        // Download file from old URL
        const response = await fetch(file.url)
        if (!response.ok) {
          throw new Error(`Failed to download: ${response.status} ${response.statusText}`)
        }

        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        // Determine file type from extension
        const extension = path.extname(file.name).toLowerCase()
        let mimeType = 'application/octet-stream'
        
        if (['.jpg', '.jpeg'].includes(extension)) mimeType = 'image/jpeg'
        else if (extension === '.png') mimeType = 'image/png'
        else if (extension === '.gif') mimeType = 'image/gif'
        else if (extension === '.webp') mimeType = 'image/webp'
        else if (extension === '.pdf') mimeType = 'application/pdf'
        else if (['.mp4', '.mov'].includes(extension)) mimeType = 'video/mp4'
        else if (extension === '.mp3') mimeType = 'audio/mpeg'

        // Create a File object for UploadThing
        // In Node.js, we need to use Blob and File from the global scope (available in Node 18+)
        const blob = new Blob([buffer], { type: mimeType })
        const fileObj = new File([blob], file.name, { type: mimeType })

        console.log(`  ⬆️  Uploading to new account: ${file.name}`)

        // Upload to new UploadThing account using UTApi
        console.log(`  🔄 Calling UTApi.uploadFiles for: ${file.name}`)
        const uploadResult = await utapi.uploadFiles([fileObj])
        
        console.log(`  📥 Upload result:`, JSON.stringify(uploadResult, null, 2))

        if (!uploadResult || uploadResult.length === 0) {
          throw new Error('Upload failed: No result returned')
        }

        const result = uploadResult[0] as any
        
        // Log the full result structure for debugging
        console.log(`  🔍 Result structure:`, JSON.stringify(result, null, 2))
        
        // Check for errors in the result (UTApi returns { data, error } structure)
        if (result.error) {
          const errorMsg = typeof result.error === 'string' 
            ? result.error 
            : JSON.stringify(result.error, null, 2)
          throw new Error(`Upload failed: ${errorMsg}`)
        }

        // Get the URL from the result - UTApi returns { data: { url, ufsUrl, ... }, error: null }
        const resultData = (result as any).data || result
        const newUrl = resultData?.url || resultData?.ufsUrl || resultData?.fileUrl || (result as any).url
        if (!newUrl) {
          console.error('Full result object:', JSON.stringify(result, null, 2))
          throw new Error('Upload failed: No URL in response. Check the result structure above.')
        }
        urlMapping[file.url] = newUrl

        console.log(`  ✅ Success: ${file.name}`)
        console.log(`     Old: ${file.url}`)
        console.log(`     New: ${newUrl}`)

        successful++
        return {
          oldUrl: file.url,
          newUrl,
          success: true,
        } as MigrationResult
      } catch (error: any) {
        console.error(`  ❌ Failed: ${file.name}`)
        
        // Better error extraction
        let errorMessage = 'Unknown error'
        if (error) {
          if (typeof error === 'string') {
            errorMessage = error
          } else if (error.message) {
            errorMessage = error.message
          } else if (error.toString && error.toString() !== '[object Object]') {
            errorMessage = error.toString()
          } else {
            try {
              errorMessage = JSON.stringify(error, Object.getOwnPropertyNames(error), 2)
            } catch {
              errorMessage = 'Error object could not be serialized'
            }
          }
        }
        
        console.error(`     Error: ${errorMessage}`)
        if (error?.stack) {
          console.error(`     Stack trace:`, error.stack.split('\n').slice(0, 3).join('\n'))
        }
        failed++
        return {
          oldUrl: file.url,
          newUrl: null,
          success: false,
          error: errorMessage,
        } as MigrationResult
      }
    })

    const batchResults = await Promise.all(batchPromises)
    results.push(...batchResults)
    processed += batch.length

    // Progress update
    console.log(`\n📊 Progress: ${processed}/${oldFiles.length} files processed (${successful} successful, ${failed} failed)`)

    // Small delay between batches to avoid rate limiting
    if (i + batchSize < oldFiles.length) {
      console.log('⏳ Waiting 2 seconds before next batch...')
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  // Save migration results
  const resultsPath = path.join(process.cwd(), 'uploadthing-migration-results.json')
  fs.writeFileSync(
    resultsPath,
    JSON.stringify({
      migratedAt: new Date().toISOString(),
      totalFiles: oldFiles.length,
      successful,
      failed,
      results,
      urlMapping,
    }, null, 2)
  )

  console.log('\n' + '='.repeat(60))
  console.log('📊 Migration Summary')
  console.log('='.repeat(60))
  console.log(`Total files: ${oldFiles.length}`)
  console.log(`✅ Successful: ${successful}`)
  console.log(`❌ Failed: ${failed}`)
  console.log(`\n📄 Results saved to: ${resultsPath}`)
  console.log(`\n🔗 URL mapping saved in results file for database updates`)

  if (failed > 0) {
    console.log('\n⚠️  Some files failed to migrate. Check the results file for details.')
    process.exit(1)
  } else {
    console.log('\n🎉 All files migrated successfully!')
  }
}

// Run the migration
migrateFiles().catch((error) => {
  console.error('❌ Fatal error:', error)
  process.exit(1)
})

