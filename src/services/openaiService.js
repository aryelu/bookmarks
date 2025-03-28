// OpenAI API integration

// Generate a unique ID
function generateUniqueId() {
  return 'bm_' + Math.random().toString(36).substr(2, 9);
}

export const organizeBookmarksWithOpenAI = async (bookmarks, organizationType, apiKey, model = "gpt-3.5-turbo-16k", temperature = 0.7) => {
  if (!apiKey) {
    throw new Error('OpenAI API key is required');
  }
  
  try {
    // Prepare bookmarks data for OpenAI with IDs assigned
    const { bookmarksWithIds, idMap, pathIdMap, domainMap } = prepareBookmarksWithIds(bookmarks);
    
    // Count total bookmarks
    const totalBookmarks = Object.keys(idMap).length;
    
    if (totalBookmarks === 0) {
      throw new Error("No bookmarks were found to organize. Please check your bookmark data structure and try again.");
    }
    
    // Check if this is a large set
    const isLargeSet = totalBookmarks > 100;
    if (isLargeSet) {
      console.log(`Large bookmark set detected - this will be processed in chunks if batch processing is enabled`);
    }
    
    // Construct the prompt based on organization type
    const prompt = constructPrompt(bookmarksWithIds, organizationType, totalBookmarks, pathIdMap, domainMap);
    
    // Map model name to proper API model identifier if needed
    const apiModel = mapModelName(model);
    
    // Log the model being used
    console.log(`Using ${apiModel} for bookmark organization`);
    
    // Create the request body with a larger max_tokens to prevent truncation
    const requestBody = {
      model: apiModel,
      messages: [
        {
          role: "system",
          content: "You are a bookmark organization assistant. Your task is to categorize bookmarks into logical categories. Your response should be in CSV format with two columns: bookmark_id,category_path - no header row needed."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: temperature,
      max_tokens: getMaxTokensForModel(apiModel)
    };
    
    // Log the request configuration without the full prompt
    console.log(`Request configuration: model=${apiModel}, temperature=${temperature}, max_tokens=${getMaxTokensForModel(apiModel)}`);
    
    // Make OpenAI API request
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', errorData);
      
      let errorMessage = `OpenAI API error: ${response.status} ${response.statusText}`;
      
      if (errorData.error) {
        if (errorData.error.message) {
          errorMessage += ` - ${errorData.error.message}`;
        }
        
        // Handle specific error types
        if (errorData.error.code === 'context_length_exceeded') {
          throw new Error('The bookmark collection is too large for this model. Try using batch processing or a model with larger context window.');
        }
        
        if (errorData.error.type === 'tokens' || errorData.error.message.includes('token')) {
          throw new Error('Token limit exceeded. Try processing in smaller batches or using a model with larger context.');
        }
      }
      
      throw new Error(errorMessage);
    }
    
    // Get response data and parse it
    const data = await response.json();
    console.log("OpenAI API Response received");
    
    // Parse the AI response into a bookmark structure
    let parsedResponse;
    try {
      // Get the category assignments from the API response
      const csvResponse = data.choices[0].message.content.trim();
      const categoryAssignments = {};
      
      // Parse CSV response into an object
      csvResponse.split('\n').forEach(line => {
        if (!line.trim()) return; // Skip empty lines
        
        // Find the first comma which separates ID from category path
        const firstCommaIndex = line.indexOf(',');
        if (firstCommaIndex > 0) {
          const id = line.substring(0, firstCommaIndex).trim();
          const categoryPath = line.substring(firstCommaIndex + 1).trim();
          
          if (id && categoryPath) {
            categoryAssignments[id] = categoryPath;
          }
        }
      });
      
      console.log("Category assignments received:", Object.keys(categoryAssignments).length);
      
      // Convert category assignments to a bookmark structure
      parsedResponse = buildBookmarkStructure(categoryAssignments, idMap);
      
      // Validate that all bookmarks are included in the response
      const responseCount = countBookmarksInTree(parsedResponse);
      
      console.log(`Original bookmark count: ${totalBookmarks}, Response bookmark count: ${responseCount}`);
      
      // If we're missing a significant number of bookmarks, warn about it
      if (responseCount < totalBookmarks * 0.95) { // Allow for 5% margin of error
        console.warn(`Warning: Response contains ${responseCount} bookmarks, but original had ${totalBookmarks}. Some bookmarks may be missing.`);
      }
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      throw parseError;
    }
    
    return parsedResponse;
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    
    // If it's already a handled error, pass it through
    if (error.message.includes('OpenAI API error') || 
        error.message.includes('API key') ||
        error.message.includes('quota') ||
        error.message.includes('Rate limit')) {
      throw error;
    }
    
    // Otherwise wrap it in a more generic message
    throw new Error(`Failed to organize bookmarks: ${error.message}`);
  }
};

// Prepare bookmarks data for the OpenAI API, assigning IDs to each bookmark
function prepareBookmarksWithIds(bookmarks) {
  // A flat list of bookmarks with IDs
  const bookmarksWithIds = [];
  // A map of ID to original bookmark information
  const idMap = {};
  // Map of folder paths to unique IDs
  const pathIdMap = {};
  // Counter for generating path IDs
  let pathIdCounter = 1;
  // Map of domains to unique IDs
  const domainMap = {};
  // Counter for domain IDs
  let domainIdCounter = 1;
  
  // Generate a compact path ID
  function getPathId(path) {
    if (!path) return '';
    if (!pathIdMap[path]) {
      pathIdMap[path] = 'p' + pathIdCounter++;
    }
    return pathIdMap[path];
  }
  
  // Get or create domain ID
  function getDomainId(url) {
    try {
      const domain = new URL(url).hostname;
      if (!domainMap[domain]) {
        domainMap[domain] = 'd' + domainIdCounter++;
      }
      return { id: domainMap[domain], domain };
    } catch (e) {
      return { id: 'd0', domain: 'unknown' };
    }
  }
  
  // Process the bookmark tree and assign IDs
  function traverseAndAssignIds(node, path = '') {
    // If it's a bookmark
    if (node.url) {
      // Generate a unique ID
      const id = generateUniqueId();
      
      // Get compact path ID
      const pathId = getPathId(path);
      
      // Get domain ID
      const { id: domainId, domain } = getDomainId(node.url);
      
      // Add to the flat list
      bookmarksWithIds.push({
        id: id,
        title: node.title || "Untitled Bookmark",
        url: node.url,
        pathId: pathId,
        domainId: domainId,
        domain: domain
      });
      
      // Store in the ID map with the original node data
      idMap[id] = {
        title: node.title || "Untitled Bookmark",
        url: node.url,
        type: 'bookmark'
      };
    } 
    // If it's a folder
    else if (node.children && node.children.length > 0) {
      const newPath = path ? `${path} > ${node.title || "Unnamed Folder"}` : (node.title || "Root");
      
      // Process each child
      node.children.forEach(child => traverseAndAssignIds(child, newPath));
    }
  }
  
  // Start processing from the root or from the node itself
  if (bookmarks.children) {
    // Root node with children
    const rootPath = bookmarks.title || "Root";
    bookmarks.children.forEach(child => traverseAndAssignIds(child, rootPath));
  } else {
    // Single node
    traverseAndAssignIds(bookmarks);
  }
  
  console.log(`Processed ${bookmarksWithIds.length} bookmarks with unique IDs and ${Object.keys(domainMap).length} unique domains`);
  
  return { bookmarksWithIds, idMap, pathIdMap, domainMap };
}

// Construct a prompt for ID-based organization
function constructPrompt(bookmarksWithIds, organizationType, totalBookmarks, pathIdMap, domainMap) {
  let instructions = '';
  
  switch (organizationType) {
    case 'category':
      instructions = `You are a bookmark organization assistant. Your task is to categorize bookmarks into a logical, general-purpose folder structure that reflects their purpose and content.

When analyzing each bookmark:
1. Examine the URL and domain to understand the website's actual content and purpose
2. Consider the existing hierarchical structure (path) as a clue to how the user previously organized it
3. Evaluate the title to extract meaningful keywords

Organize bookmarks into meaningful, broad-purpose categories (with subfolders if needed). Group similar sites together, even if they came from different paths.

Example categories should be broad-purpose and could include but not limited to:
- Productivity & Planning
- Finance & Investing
- Learning & Study
- Art & Creativity
- Development & Programming
- Career & Interviews
- Crypto & Blockchain
- Shopping & Tools
- Kids & Education
- Entertainment & Media
- Personal & Admin

You may use subfolders if they improve clarity (e.g. "Art & Creativity/Videos" or "Crypto & Blockchain/NFT").`;
      break;

    case 'alphabetical':
      instructions = `Please organize these bookmarks alphabetically, grouping them by the first letter of their title. Create a separate folder for each letter and place non-alphabetic titles in a "#" folder.

Example categories would be:
- A
- B
- C
etc.

You can create subfolders for further organization if there are many bookmarks starting with the same letter.`;
      break;

    case 'domain':
      instructions = `Based on the domains in the URLs, organize these bookmarks by website or service type. 

Create meaningful category names based on the service type (e.g., "Google Services", "Social Media", "News Sites") and group bookmarks from the same domain together.`;
      break;

    default:
      instructions = `Please organize these bookmarks into a logical folder structure. Use the URLs, titles, and existing paths to inform your categorization.`;
  }

  console.log(`Constructing prompt for ${totalBookmarks} bookmarks with organization type: ${organizationType}`);

  // Convert bookmarks to CSV format
  let csvData = "id,title,domainId,pathId\n";
  bookmarksWithIds.forEach(bookmark => {
    // Escape any commas in the fields
    const safeTitle = bookmark.title.replace(/,/g, "\\,").replace(/"/g, '""');
    csvData += `${bookmark.id},"${safeTitle}",${bookmark.domainId},${bookmark.pathId}\n`;
  });

  // Create path mapping as CSV
  let pathMapData = "pathId,fullPath\n";
  Object.entries(pathIdMap).forEach(([path, id]) => {
    const safePath = path.replace(/,/g, "\\,").replace(/"/g, '""');
    pathMapData += `${id},"${safePath}"\n`;
  });
  
  // Create domain mapping as CSV
  let domainMapData = "domainId,domain\n";
  Object.entries(domainMap).forEach(([domain, id]) => {
    domainMapData += `${id},${domain}\n`;
  });

  return `${instructions}

I have ${totalBookmarks} bookmarks that I need organized. Each bookmark has a unique ID and information in CSV format:

${csvData}

The pathId in the data above refers to the original folder path, according to this mapping:

${pathMapData}

The domainId refers to the website domain, according to this mapping:

${domainMapData}

Please analyze the domains and titles to determine appropriate categories. When generating your response:
1. Create meaningful category names for different types of bookmarks
2. Use "/" to indicate hierarchy (e.g., "Development/JavaScript")
3. Provide your response as a CSV with two columns: bookmark_id,category_path (no header row)
4. Consider the original path information when deciding categories

Example response format:
bm_123abc,Development/JavaScript
bm_456def,Finance/Investing
bm_789ghi,Entertainment/Movies

Guidelines:
1. Assign EVERY bookmark to a category - don't skip any bookmark IDs
2. Use descriptive category names that reflect the content
3. Create 5-15 top-level categories with appropriate subcategories where needed
4. Analyze both the domain and existing path to derive context
5. Group similar bookmarks together even if they came from different paths
6. If you're unsure about a bookmark's category, place it in an "Unknown" folder that I can organize later`;
}

// Convert category assignments to a bookmark structure
function buildBookmarkStructure(categoryAssignments, idMap) {
  // Create the root folder
  const rootStructure = {
    type: 'folder',
    title: 'Bookmarks Bar',
    children: []
  };
  
  // Map to hold folder references for quick access
  const folderMap = {
    '': rootStructure // Root reference
  };
  
  // Process each bookmark by its ID and assigned category
  Object.entries(categoryAssignments).forEach(([id, categoryPath]) => {
    // Skip if the ID isn't in our map (shouldn't happen)
    if (!idMap[id]) {
      console.warn(`ID ${id} not found in the ID map`);
      return;
    }
    
    // Get the bookmark data
    const bookmark = idMap[id];
    
    // Split the category path into parts
    const pathParts = categoryPath.split('/').filter(part => part.trim());
    
    // Ensure there's at least one category
    if (pathParts.length === 0) {
      pathParts.push('Uncategorized');
    }
    
    // Build or find the folder structure
    let currentPath = '';
    let currentFolder = rootStructure;
    
    // Create/navigate the folder hierarchy
    for (let i = 0; i < pathParts.length; i++) {
      const folderName = pathParts[i].trim();
      
      // Update the current path
      currentPath = currentPath ? `${currentPath}/${folderName}` : folderName;
      
      // Check if we already have this folder
      if (!folderMap[currentPath]) {
        // Create new folder
        const newFolder = {
          type: 'folder',
          title: folderName,
          children: []
        };
        
        // Add to parent folder
        currentFolder.children.push(newFolder);
        
        // Store reference
        folderMap[currentPath] = newFolder;
      }
      
      // Navigate to this folder for next iteration
      currentFolder = folderMap[currentPath];
    }
    
    // Finally, add the bookmark to the last folder
    currentFolder.children.push({
      type: 'bookmark',
      title: bookmark.title,
      url: bookmark.url
    });
  });
  
  // Sort folders and bookmarks alphabetically
  function sortNodeChildren(node) {
    if (node.children && node.children.length > 0) {
      // Sort children - folders first, then bookmarks, both alphabetically
      node.children.sort((a, b) => {
        // First by type (folder then bookmark)
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        // Then by title alphabetically
        return a.title.localeCompare(b.title);
      });
      
      // Sort children of folders recursively
      node.children.forEach(child => {
        if (child.type === 'folder') {
          sortNodeChildren(child);
        }
      });
    }
  }
  
  // Sort all folders and bookmarks
  sortNodeChildren(rootStructure);
  
  return rootStructure;
}

// Test if the API key is valid
export const testApiKey = async (apiKey) => {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('API key is required');
  }
  
  try {
    // Make a minimal API call to test the key
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey.trim()}`
      }
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      
      if (errorData.error?.type === 'insufficient_quota') {
        throw new Error('Your OpenAI API key has insufficient quota. Please check your billing information.');
      } else if (errorData.error?.code === 'invalid_api_key') {
        throw new Error('Invalid API key. Please check that you\'ve entered your API key correctly.');
      } else if (response.status === 401) {
        throw new Error('Authentication failed. The API key appears to be invalid.');
      } else {
        throw new Error(`API error: ${errorData.error?.message || response.statusText}`);
      }
    }
    
    // If we got here, the key is valid
    return { valid: true, message: 'API key is valid' };
  } catch (error) {
    console.error('Error testing API key:', error);
    return { 
      valid: false, 
      message: error.message || 'Failed to validate API key' 
    };
  }
};

// Helper function to map UI model names to API model identifiers
function mapModelName(modelName) {
  // Map from UI display names to actual API identifiers if needed
  const modelMapping = {
    "GPT-3.5 (Basic, Faster)": "gpt-3.5-turbo",
    "GPT-3.5 Turbo 16k (Recommended, Good Balance)": "gpt-3.5-turbo-16k",
    "GPT-4 (High Quality, Slower, More Expensive)": "gpt-4",
    "GPT-4 Turbo (Latest, Best Quality, Most Expensive)": "gpt-4-turbo"
  };
  
  return modelMapping[modelName] || modelName; // Use the mapping or return the original if not found
}

// Determine maximum tokens based on model
function getMaxTokensForModel(model) {
  if (model.includes('gpt-4')) {
    return 4000; // Larger token limit for GPT-4 to prevent truncation
  } else if (model.includes('16k')) {
    return 3000; // GPT-3.5-16k with conservative limit
  } else {
    return 2000; // GPT-3.5 with conservative limit
  }
}

// Helper function to count bookmarks in a tree structure
function countBookmarksInTree(node) {
  if (!node) return 0;
  
  let count = 0;
  
  if (node.url) {
    // It's a bookmark
    count = 1;
  } else if (node.children) {
    // It's a folder - count children recursively
    count = node.children.reduce((sum, child) => sum + countBookmarksInTree(child), 0);
  }
  
  return count;
}

// Handler for large bookmark collections
export const processLargeBookmarkCollection = async (bookmarks, organizationType, apiKey, model = "gpt-3.5-turbo-16k", temperature = 0.7) => {
  // Use the ID assignment function to get our bookmark with IDs
  const { bookmarksWithIds, idMap, pathIdMap, domainMap } = prepareBookmarksWithIds(bookmarks);
  
  // Skip batch processing if the collection is small enough
  if (bookmarksWithIds.length <= 300) {
    return organizeBookmarksWithOpenAI(bookmarks, organizationType, apiKey, model, temperature);
  }
  
  // For large collections, split into smaller chunks to prevent token limits
  const chunkSize = model.includes('gpt-4') ? 250 : 350;
  const chunks = chunkArray(bookmarksWithIds, chunkSize);
  console.log(`Processing ${bookmarksWithIds.length} bookmarks in ${chunks.length} chunks using ${model}`);
  
  // Store all category assignments
  const allCategoryAssignments = {};
  // Track categories we've seen so far
  const existingCategories = new Set();
  let chunkIndex = 1;
  
  for (const chunk of chunks) {
    console.log(`Processing chunk ${chunkIndex} of ${chunks.length} (${chunk.length} bookmarks)...`);
    
    try {
      // Construct the prompt for this chunk, including existing categories
      const prompt = constructPromptWithCategories(chunk, organizationType, 
                                                  chunk.length, 
                                                  Array.from(existingCategories),
                                                  pathIdMap,
                                                  domainMap);
      
      // Map model name to proper API model identifier if needed
      const apiModel = mapModelName(model);
      
      // Create the request body
      const requestBody = {
        model: apiModel,
        messages: [
          {
            role: "system",
            content: "You are a bookmark organization assistant. Your task is to categorize bookmarks into logical categories. Your response should be in CSV format with two columns: bookmark_id,category_path - no header row needed."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: temperature,
        max_tokens: getMaxTokensForModel(apiModel)
      };
      
      // Make OpenAI API request
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('OpenAI API error:', errorData);
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }
      
      // Get response data
      const data = await response.json();
      console.log(`Chunk ${chunkIndex} response received`);
      
      // Parse the category assignments from this chunk
      const csvResponse = data.choices[0].message.content.trim();
      const categoryAssignments = {};
      
      // Parse CSV response into an object
      csvResponse.split('\n').forEach(line => {
        if (!line.trim()) return; // Skip empty lines
        
        // Find the first comma which separates ID from category path
        const firstCommaIndex = line.indexOf(',');
        if (firstCommaIndex > 0) {
          const id = line.substring(0, firstCommaIndex).trim();
          const categoryPath = line.substring(firstCommaIndex + 1).trim();
          
          if (id && categoryPath) {
            categoryAssignments[id] = categoryPath;
          }
        }
      });
      
      console.log(`Chunk ${chunkIndex} assignments: ${Object.keys(categoryAssignments).length}`);
      
      // Update existing categories with the ones from this chunk
      Object.values(categoryAssignments).forEach(category => {
        existingCategories.add(category);
      });
      
      // Merge into the full assignments object
      Object.assign(allCategoryAssignments, categoryAssignments);
      
    } catch (error) {
      console.error(`Error processing chunk ${chunkIndex}:`, error);
      
      // If this chunk is still too large, split it further
      if (chunk.length > 75 && (error.message.includes('too large') || error.message.includes('max tokens'))) {
        console.log(`Chunk ${chunkIndex} too large, splitting further...`);
        
        const subChunks = chunkArray(chunk, Math.ceil(chunk.length / 2));
        for (let i = 0; i < subChunks.length; i++) {
          const subChunk = subChunks[i];
          console.log(`Processing sub-chunk ${i+1} of ${subChunks.length} (${subChunk.length} bookmarks)...`);
          
          try {
            // Process this sub-chunk
            const subPrompt = constructPromptWithCategories(subChunk, organizationType, subChunk.length, Array.from(existingCategories), pathIdMap, domainMap);
            
            // Map model name to proper API model identifier if needed
            const apiModel = mapModelName(model);
            
            // Create the request body
            const requestBody = {
              model: apiModel,
              messages: [
                {
                  role: "system",
                  content: "You are a bookmark organization assistant. Your task is to categorize bookmarks into logical categories. Your response should be in CSV format with two columns: bookmark_id,category_path - no header row needed."
                },
                {
                  role: "user",
                  content: subPrompt
                }
              ],
              temperature: temperature,
              max_tokens: getMaxTokensForModel(apiModel)
            };
            
            // Make OpenAI API request
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
              },
              body: JSON.stringify(requestBody)
            });
            
            if (!response.ok) {
              throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
            }
            
            // Get response data
            const data = await response.json();
            
            // Parse the category assignments from this sub-chunk
            const csvResponse = data.choices[0].message.content.trim();
            const subCategoryAssignments = {};
            
            // Parse CSV response into an object
            csvResponse.split('\n').forEach(line => {
              if (!line.trim()) return; // Skip empty lines
              
              // Find the first comma which separates ID from category path
              const firstCommaIndex = line.indexOf(',');
              if (firstCommaIndex > 0) {
                const id = line.substring(0, firstCommaIndex).trim();
                const categoryPath = line.substring(firstCommaIndex + 1).trim();
                
                if (id && categoryPath) {
                  subCategoryAssignments[id] = categoryPath;
                }
              }
            });
            
            console.log(`Sub-chunk ${i+1} assignments: ${Object.keys(subCategoryAssignments).length}`);
            
            // Merge into the full assignments object
            Object.assign(allCategoryAssignments, subCategoryAssignments);
            
          } catch (subError) {
            console.error('Error processing sub-chunk:', subError);
            
            // Fallback - assign each bookmark to a default category
            subChunk.forEach(bookmark => {
              allCategoryAssignments[bookmark.id] = "Uncategorized/Failed to Categorize";
            });
          }
        }
      } else {
        // Fallback - assign each bookmark to a default category
        chunk.forEach(bookmark => {
          allCategoryAssignments[bookmark.id] = "Uncategorized/Failed to Categorize";
        });
      }
    }
    
    chunkIndex++;
  }
  
  console.log(`All chunks processed. Total assignments: ${Object.keys(allCategoryAssignments).length}`);
  
  // Build the final bookmark structure from all the category assignments
  return buildBookmarkStructure(allCategoryAssignments, idMap);
};

// Construct a prompt with existing categories for context
function constructPromptWithCategories(bookmarksWithIds, organizationType, totalBookmarks, existingCategories, pathIdMap, domainMap) {
  // Start with the standard instructions
  let instructions = getOrganizationInstructions(organizationType);
  
  // Add context about existing categories if any
  let categoryContext = "";
  if (existingCategories.length > 0) {
    categoryContext = `\nI've already organized some bookmarks into the following categories:\n\n${existingCategories.join('\n')}\n\nPlease use these existing categories when appropriate to maintain consistency, but you can also create new categories if needed.`;
  }
  
  console.log(`Constructing prompt for ${totalBookmarks} bookmarks with ${existingCategories.length} existing categories`);

  // Convert bookmarks to CSV format
  let csvData = "id,title,domainId,pathId\n";
  bookmarksWithIds.forEach(bookmark => {
    // Escape any commas in the fields
    const safeTitle = bookmark.title.replace(/,/g, "\\,").replace(/"/g, '""');
    csvData += `${bookmark.id},"${safeTitle}",${bookmark.domainId},${bookmark.pathId}\n`;
  });

  // Create path mapping as CSV
  let pathMapData = "pathId,fullPath\n";
  Object.entries(pathIdMap).forEach(([path, id]) => {
    const safePath = path.replace(/,/g, "\\,").replace(/"/g, '""');
    pathMapData += `${id},"${safePath}"\n`;
  });

  // Create domain mapping as CSV
  let domainMapData = "domainId,domain\n";
  Object.entries(domainMap).forEach(([domain, id]) => {
    domainMapData += `${id},${domain}\n`;
  });

  return `${instructions}${categoryContext}

I have ${totalBookmarks} bookmarks that I need organized. Each bookmark has a unique ID and information in CSV format:

${csvData}

The pathId in the data above refers to the original folder path, according to this mapping:

${pathMapData}

The domainId refers to the website domain, according to this mapping:

${domainMapData}

Please analyze the domains and titles to determine appropriate categories. When generating your response:
1. Create meaningful category names for different types of bookmarks
2. Use "/" to indicate hierarchy (e.g., "Development/JavaScript")
3. Provide your response as a CSV with two columns: bookmark_id,category_path (no header row)
4. Reuse the existing categories listed above when applicable
5. Consider the original path information when deciding categories

Example response format:
bm_123abc,Development/JavaScript
bm_456def,Finance/Investing
bm_789ghi,Entertainment/Movies

Guidelines:
1. Assign EVERY bookmark to a category - don't skip any bookmark IDs
2. Use the existing categories listed above when appropriate
3. Create new categories only when necessary
4. Analyze both the domain and existing path to derive context
5. Group similar bookmarks together
6. If you're unsure about a bookmark's category, place it in an "Unknown" folder that I can organize later`;
}

// Get organization instructions based on type
function getOrganizationInstructions(organizationType) {
  switch (organizationType) {
    case 'category':
      return `You are a bookmark organization assistant. Your task is to categorize bookmarks into a logical, general-purpose folder structure that reflects their purpose and content.

When analyzing each bookmark:
1. Examine the URL and domain to understand the website's actual content and purpose
2. Consider the existing hierarchical structure (path) as a clue to how the user previously organized it
3. Evaluate the title to extract meaningful keywords

Organize bookmarks into meaningful, broad-purpose categories (with subfolders if needed). Group similar sites together, even if they came from different paths.`;
    // ... other organization types ...
    default:
      return `Please organize these bookmarks into a logical folder structure. Use the URLs, titles, and existing paths to inform your categorization.`;
  }
}

// Split array into chunks
function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
} 